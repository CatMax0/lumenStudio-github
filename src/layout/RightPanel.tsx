import { useState, useRef, useCallback, useEffect } from 'react'
import { useStage } from '../store/stage'
import { useProject } from '../store/project'
import { useGenerate } from '../store/generate'
import { chatCompletion, chatCompletionStream, PROMPTS, safeJsonParse } from '../services/ai'
import type { ModelProvider, Shot, WorldBuilding } from '../types/project'
import { chapterLabel } from '../types/project'

export function RightPanel() {
  const { stage } = useStage()
  const { projectLoaded } = useProject()

  if (stage === 'projects' || stage === 'library' || stage === 'settings' || !projectLoaded) return null

  return (
    <aside className="w-80 shrink-0 bg-panel border-l border-line flex flex-col">
      {stage === 'worldbuilding' && <WorldBuildingAI />}
      {stage === 'outline' && <OutlineAI />}
      {stage === 'chapter' && <ChapterAI />}
      {stage === 'storyboard' && <StoryboardAI />}
      {stage === 'generate' && <GenerateControls />}
    </aside>
  )
}

// ===== 世界观生成 =====
function buildWorldBuildingContext(wb: WorldBuilding): string {
  const parts: string[] = []
  if (wb.synopsis) parts.push(`故事梗概: ${wb.synopsis}`)
  if (wb.characters) parts.push(`角色设定: ${wb.characters}`)
  if (wb.pace) parts.push(`节奏: ${wb.pace}`)
  if (wb.totalEpisodes) parts.push(`总集数: ${wb.totalEpisodes}`)
  if (wb.episodeMinutes) parts.push(`单集时长: ${wb.episodeMinutes} 分钟`)
  return parts.join('\n')
}

function WorldBuildingAI() {
  const { providers, theme, genre, worldBuilding, updateWorldBuilding, addAsset, replaceActs, addChapter, updateChapter } = useProject()
  const llmProviders = providers.filter((p) => p.kind === 'llm' && p.enabled)
  const [selectedProviderId, setSelectedProviderId] = useState<string>('')
  const [extra, setExtra] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [tokenInfo, setTokenInfo] = useState('--')
  const abortRef = useRef<AbortController | null>(null)

  const provider = llmProviders.find((p) => p.id === selectedProviderId) ?? llmProviders[0]

  const handleGenerateFullFlow = useCallback(async () => {
    if (!provider) return
    if (!theme.trim()) { setTokenInfo('请先填写故事主题'); return }
    setLoading(true)
    setStreamText('')
    setTokenInfo('...')
    abortRef.current = new AbortController()

    try {
      setStreamText('正在生成故事背景...')
      const messagesWB = PROMPTS.generateWorldBuilding(theme, genre, extra)
      const resWB = await chatCompletion({ provider, messages: messagesWB, temperature: 0.8, signal: abortRef.current.signal })
      const cleanedWB = resWB.content.replace(/```json\n?|```/g, '').trim()
      const parsedWB = safeJsonParse(cleanedWB)
      
      if (parsedWB && typeof parsedWB === 'object') {
        // 映射 AI 返回的结构化数据到精简后的故事背景字段 (故事梗概 / 角色设定)
        const wbUpdate: Partial<WorldBuilding> = {}
        const p = parsedWB as Record<string, any>
        wbUpdate.synopsis = [p.synopsis, p.worldview, p.stylesAndPacing].filter(Boolean).join('\n\n')
        if (typeof p.characters === 'string') wbUpdate.characters = p.characters
        if (Array.isArray(parsedWB.characters)) {
          parsedWB.characters.forEach((c: any) => {
            addAsset({ 
              name: c.name, 
              category: 'character', 
              group: '默认', 
              tags: [], 
              character: { 
                alias: c.name,
                age: c.age || '',
                gender: (c.gender === 'male' || c.gender === 'female' || c.gender === 'neutral') ? c.gender : 'unknown',
                identity: c.identity || '',
                appearance: c.appearance || '',
                outfit: c.outfit || '',
                personality: c.personality || '',
                background: c.background || c.description || ''
              }, 
              description: c.description || c.background || '' 
            })
          })

          // 同时生成角色描述文本，合并到 characters 字段
          const chText = parsedWB.characters.map((c: any) => `${c.name}: ${c.description || c.background || ''}`).join('\n')

          wbUpdate.characters = [chText, p.relationships].filter(Boolean).join('\n\n')

        }

        if (Array.isArray(parsedWB.props)) {
          parsedWB.props.forEach((pr: any) => {
            addAsset({ name: pr.name, category: 'prop', group: '默认', tags: [], description: pr.description })
          })
        }

        if (Array.isArray(parsedWB.scenes)) {
          parsedWB.scenes.forEach((s: any) => {
            addAsset({ name: s.name, category: 'scene', group: '默认', tags: [], description: s.description })
          })
        }

        updateWorldBuilding(wbUpdate)
      }
      setTokenInfo('故事背景完成，开始生成大纲...')
      setStreamText('故事背景生成完毕，正在生成大纲...')

      const wbContext = buildWorldBuildingContext(worldBuilding)
      const messagesOutline = PROMPTS.generateOutline(theme, `${genre} / ${worldBuilding.pace || '快节奏'}`, wbContext, extra)
      const resOutline = await chatCompletion({ provider, messages: messagesOutline, temperature: 0.8, signal: abortRef.current.signal })
      const cleanedOutline = resOutline.content.replace(/```json\n?|```/g, '').trim()
      const parsedOutline = safeJsonParse(cleanedOutline) as Array<{ title: string; summary: string; goal?: string }>
      
      let createdActs: any[] = []
      if (Array.isArray(parsedOutline) && parsedOutline.length > 0) {
        createdActs = replaceActs(parsedOutline)
        setStreamText(`已生成 ${parsedOutline.length} 个故事点`)
      }
      
      setTokenInfo(`大纲完成，开始生成第一章...`)
      setStreamText('大纲生成完毕，正在生成第一章...')

      if (createdActs.length > 0) {
        const firstAct = createdActs[0]
        const firstChId = addChapter(firstAct.id)

        const messagesCh = PROMPTS.generateChapter({
          storyPoint: `${firstAct.index} · ${firstAct.title}: ${firstAct.summary}`,
          storyPointGoal: firstAct.goal || '',
          chapterLabel: '1-1',
          worldBuildingContext: wbContext,
          recentSummaries: '',
          characterStates: '',
          currentTask: '',
          chapterGoal: '',
          extraInstructions: extra
        })
        
        let fullCh = ''
        await chatCompletionStream(
          { provider, messages: messagesCh, temperature: 0.8, signal: abortRef.current.signal },
          {
            onToken: (token) => { fullCh += token; setStreamText(`正在生成第一章:\n\n${fullCh}`) },
            onDone: (content) => {
              updateChapter(firstChId, { synopsis: content })
            }
          }
        )
      }
      setTokenInfo('done')
      setStreamText('全流程生成完毕！')
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setTokenInfo(`错误: ${err instanceof Error ? err.message.slice(0, 50) : '未知'}`)
    } finally {
      setLoading(false)
    }
  }, [provider, theme, genre, extra, worldBuilding, updateWorldBuilding, addAsset, replaceActs, addChapter, updateChapter])

  return (
    <>
      <PanelHeader title="AI 故事背景生成" />
      <div className="flex-1 overflow-auto p-3 space-y-3">
        <FieldGroup label="LLM Provider">
          <ProviderSelect providers={llmProviders} value={selectedProviderId} onChange={setSelectedProviderId} placeholder="请先在设置中添加 LLM" />
        </FieldGroup>
        <div className="p-2 bg-panel-deep border border-line text-2xs text-ink-mute">
          根据主题和题材自动生成故事梗概，角色/场景/道具将自动提取为素材库资产
        </div>
        <FieldGroup label="补充指令">
          <textarea value={extra} onChange={(e) => setExtra(e.target.value)} className="w-full h-20 p-2 bg-panel-deep border border-line text-xs text-ink resize-none focus:border-accent focus:outline-none" placeholder="对故事背景的额外要求..." />
        </FieldGroup>
        {loading ? (
          <button onClick={() => { abortRef.current?.abort(); setLoading(false) }} className="w-full h-8 bg-accent-danger/20 text-accent-danger text-xs hover:bg-accent-danger/30">停止生成</button>
        ) : (
          <button onClick={handleGenerateFullFlow} disabled={!provider} className="w-full h-8 bg-accent text-white text-xs hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed">全自动生成 (故事背景+大纲+首章)</button>
        )}
        {streamText && (
          <div className="p-2 bg-panel-deep border border-line text-2xs text-ink-mute max-h-40 overflow-auto whitespace-pre-wrap">
            {streamText}
          </div>
        )}
        <StatusBlock model={provider?.name ?? '未配置'} info={tokenInfo} />
      </div>
    </>
  )
}

// ===== 大纲阶段: AI 辅助生成大纲 =====
function OutlineAI() {
  const { providers, theme, genre, worldBuilding, replaceActs } = useProject()
  const llmProviders = providers.filter((p) => p.kind === 'llm' && p.enabled)
  const [selectedProviderId, setSelectedProviderId] = useState<string>('')
  const [extra, setExtra] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [tokenInfo, setTokenInfo] = useState('--')
  const abortRef = useRef<AbortController | null>(null)

  const provider = llmProviders.find((p) => p.id === selectedProviderId) ?? llmProviders[0]

  const handleGenerate = useCallback(async () => {
    if (!provider) return
    if (!theme.trim()) {
      setTokenInfo('请先填写故事主题')
      return
    }
    setLoading(true)
    setStreamText('')
    setTokenInfo('...')
    abortRef.current = new AbortController()

    const wbContext = buildWorldBuildingContext(worldBuilding)
    const messages = PROMPTS.generateOutline(theme, `${genre} / ${worldBuilding.pace || '快节奏'}`, wbContext, extra)

    try {
      const result = await chatCompletion({
        provider,
        messages,
        temperature: 0.8,
        signal: abortRef.current.signal
      })
      setTokenInfo(result.usage ? `${result.usage.totalTokens} tokens` : 'done')

      const cleaned = result.content.replace(/```json\n?|```/g, '').trim()
      const parsed = safeJsonParse(cleaned) as Array<{ title: string; summary: string; goal?: string }>
      if (Array.isArray(parsed) && parsed.length > 0) {
        replaceActs(parsed)
        setStreamText(`已生成 ${parsed.length} 个故事点`)
      } else {
        setStreamText(result.content)
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setTokenInfo(`错误: ${err instanceof Error ? err.message.slice(0, 50) : '未知'}`)
    } finally {
      setLoading(false)
    }
  }, [provider, theme, genre, worldBuilding, extra, replaceActs])

  const handleAbort = () => {
    abortRef.current?.abort()
    setLoading(false)
  }

  return (
    <>
      <PanelHeader title="AI 大纲生成" />
      <div className="flex-1 overflow-auto p-3 space-y-3">
        <FieldGroup label="LLM Provider">
          <ProviderSelect
            providers={llmProviders}
            value={selectedProviderId}
            onChange={setSelectedProviderId}
            placeholder="请先在设置中添加 LLM"
          />
        </FieldGroup>

        <FieldGroup label="主题预览">
          <div className="p-2 bg-panel-deep border border-line text-2xs text-ink-mute min-h-[44px] max-h-20 overflow-auto whitespace-pre-wrap">
            {theme || <span className="text-ink-dim">请在世界观面板填写故事主题</span>}
          </div>
        </FieldGroup>

        <FieldGroup label="补充指令">
          <textarea
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            className="w-full h-20 p-2 bg-panel-deep border border-line text-xs text-ink resize-none focus:border-accent focus:outline-none"
            placeholder="对 AI 的额外要求 (关键转折 / 故事点数量 / 风格参考...)"
          />
        </FieldGroup>

        {loading ? (
          <button
            onClick={handleAbort}
            className="w-full h-8 bg-accent-danger/20 text-accent-danger text-xs hover:bg-accent-danger/30"
          >
            停止生成
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={!provider}
            className="w-full h-8 bg-accent text-white text-xs hover:bg-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            生成大纲 (覆盖现有)
          </button>
        )}

        {streamText && (
          <div className="p-2 bg-panel-deep border border-line text-2xs text-ink-mute max-h-32 overflow-auto whitespace-pre-wrap">
            {streamText}
          </div>
        )}

        <StatusBlock model={provider?.name ?? '未配置'} info={tokenInfo} />
      </div>
    </>
  )
}

// ===== 章节阶段: AI 章节故事生成 =====
function ChapterAI() {
  const { providers, acts, chapters, selectedChapterId, updateChapter, worldBuilding } = useProject()
  const llmProviders = providers.filter((p) => p.kind === 'llm' && p.enabled)
  const [selectedProviderId, setSelectedProviderId] = useState<string>('')
  const [strategy, setStrategy] = useState('expand')
  const [extra, setExtra] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [tokenInfo, setTokenInfo] = useState('--')
  const [genRange, setGenRange] = useState<'single' | 'all'>('single')
  const [continueChId, setContinueChId] = useState<string>('')
  const abortRef = useRef<AbortController | null>(null)

  const provider = llmProviders.find((p) => p.id === selectedProviderId) ?? llmProviders[0]
  const ch = chapters.find((c) => c.id === selectedChapterId)

  // 当章节或策略改变时，初始化续写来源章节为前一章
  useEffect(() => {
    if (ch) {
      const idx = chapters.indexOf(ch)
      if (idx > 0) {
        setContinueChId(chapters[idx - 1].id)
      } else {
        setContinueChId('')
      }
    }
  }, [ch, chapters])

  const handleActChange = useCallback((newActId: string) => {
    const foundAct = acts.find(a => a.id === newActId)
    if (foundAct && ch) {
      const chaptersInAct = chapters.filter((c) => c.actId === newActId)
      updateChapter(ch.id, {
        actId: newActId,
        actIndex: foundAct.index,
        chapterIndex: chaptersInAct.length + 1
      })
    }
  }, [acts, ch, chapters, updateChapter])

  const handleGenerate = useCallback(async () => {
    if (!provider) return
    setLoading(true)
    setStreamText('')
    setTokenInfo('...')
    abortRef.current = new AbortController()

    const generateSingleCh = async (targetCh: typeof chapters[0], signal: AbortSignal, chIndexInList: number, totalCount: number) => {
      const targetAct = acts.find((a) => a.id === targetCh.actId)
      
      // Calculate index and previous chapters
      const chIdx = chapters.indexOf(targetCh)
      const recentChapters = chapters.slice(Math.max(0, chIdx - 3), chIdx)
      const recentSummaries = recentChapters
        .map((c) => `${chapterLabel(c)} ${c.title}: ${c.chapterSummary || c.synopsis.slice(0, 200)}`)
        .join('\n')

      const prevCh = chIdx > 0 ? chapters[chIdx - 1] : null
      const charStates = prevCh?.characterStates || ''

      let actualRecentSummaries = recentSummaries
      let actualCharStates = charStates

      if (strategy === 'continue') {
        const sourceCh = chapters.find(c => c.id === continueChId) || prevCh
        if (sourceCh) {
          actualRecentSummaries = `${chapterLabel(sourceCh)} ${sourceCh.title}: ${sourceCh.chapterSummary || sourceCh.synopsis.slice(0, 200)}`
          actualCharStates = sourceCh.characterStates || ''
        }
      }

      let strategyExtra = ''
      if (strategy === 'continue') {
        const sourceChObj = chapters.find(c => c.id === continueChId) || prevCh
        const sourceLabel = sourceChObj ? chapterLabel(sourceChObj) : '上一章'
        strategyExtra = `【续写要求】请根据“${sourceLabel}”的剧情、人物状态和对话，紧密承接并自然延伸续写这一章。`
      } else if (strategy === 'rewrite') {
        strategyExtra = `【重写要求】请彻底重写当前章节，调整情节和对白，使其更加符合主题和创作要求。`
      } else {
        strategyExtra = `【展开要求】请根据选定的大纲（故事点）的内容，合理、丰富地展开这一章节。`
      }

      const combinedExtra = extra ? `${strategyExtra}\n${extra}` : strategyExtra

      const messages = PROMPTS.generateChapter({
        storyPoint: targetAct ? `${targetAct.index} · ${targetAct.title}: ${targetAct.summary}` : '',
        storyPointGoal: targetAct?.goal || '',
        chapterLabel: chapterLabel(targetCh),
        worldBuildingContext: buildWorldBuildingContext(worldBuilding),
        recentSummaries: actualRecentSummaries,
        characterStates: actualCharStates,
        currentTask: targetCh.currentTask || '',
        chapterGoal: targetCh.chapterGoal || '',
        extraInstructions: combinedExtra
      })

      let full = ''
      setStreamText((prev) => prev + `\n--- 正在生成第 ${chapterLabel(targetCh)} 章 (${chIndexInList + 1}/${totalCount}) ---\n`)

      await chatCompletionStream(
        { provider, messages, temperature: 0.8, signal },
        {
          onToken: (token) => {
            full += token
            setStreamText((prev) => prev + token)
          },
          onDone: (content) => {
            updateChapter(targetCh.id, { synopsis: content })
          },
          onError: (err) => {
            throw err
          }
        }
      )
    }

    try {
      if (genRange === 'single') {
        if (!ch) {
          setTokenInfo('请先选择一个章节')
          setLoading(false)
          return
        }
        await generateSingleCh(ch, abortRef.current.signal, 0, 1)
        setTokenInfo('done')
      } else {
        if (chapters.length === 0) {
          setTokenInfo('没有可生成的章节')
          setLoading(false)
          return
        }
        setStreamText(`开始批量生成全部 ${chapters.length} 个章节...\n`)
        for (let i = 0; i < chapters.length; i++) {
          const currentCh = chapters[i]
          await generateSingleCh(currentCh, abortRef.current.signal, i, chapters.length)
        }
        setTokenInfo('批量生成完成')
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setTokenInfo(`错误: ${err.message.slice(0, 50)}`)
      }
    } finally {
      setLoading(false)
    }
  }, [provider, ch, strategy, continueChId, acts, chapters, extra, worldBuilding, updateChapter, genRange])

  const canGenerate = provider && (genRange === 'all' ? chapters.length > 0 : !!ch)

  return (
    <>
      <PanelHeader title="AI 章节生成" />
      <div className="flex-1 overflow-auto p-3 space-y-3">
        <FieldGroup label="LLM Provider">
          <ProviderSelect
            providers={llmProviders}
            value={selectedProviderId}
            onChange={setSelectedProviderId}
            placeholder="请先在设置中添加 LLM"
          />
        </FieldGroup>

        <FieldGroup label="生成范围">
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 text-xs text-ink cursor-pointer">
              <input
                type="radio"
                name="genRange"
                checked={genRange === 'single'}
                onChange={() => setGenRange('single')}
                className="text-accent focus:ring-accent"
              />
              生成单章
            </label>
            <label className="flex items-center gap-1.5 text-xs text-ink cursor-pointer">
              <input
                type="radio"
                name="genRange"
                checked={genRange === 'all'}
                onChange={() => setGenRange('all')}
                className="text-accent focus:ring-accent"
              />
              生成全部章节
            </label>
          </div>
        </FieldGroup>

        {genRange === 'single' && (
          <FieldGroup label="当前生成章节">
            <div className="text-2xs text-ink p-2 bg-panel-deep border border-line">
              {ch ? `${chapterLabel(ch)} ${ch.title || '未命名章节'}` : <span className="text-ink-dim">请先在左侧选择章节</span>}
            </div>
          </FieldGroup>
        )}

        <FieldGroup label="生成策略">
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            className="w-full h-7 px-2 bg-panel-deep border border-line text-xs text-ink focus:border-accent focus:outline-none"
          >
            <option value="expand">从大纲展开本章</option>
            <option value="continue">续写上一章</option>
            <option value="rewrite">重写当前章</option>
          </select>
        </FieldGroup>

        {genRange === 'single' && ch && (
          <FieldGroup label="关联大纲故事点">
            <select
              value={ch.actId || ''}
              onChange={(e) => handleActChange(e.target.value)}
              className="w-full h-7 px-2 bg-panel-deep border border-line text-xs text-ink focus:border-accent focus:outline-none"
            >
              <option value="">-- 未关联大纲故事点 --</option>
              {acts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.index} · {a.title}
                </option>
              ))}
            </select>
          </FieldGroup>
        )}

        {strategy === 'continue' && (
          <FieldGroup label="根据哪一章续写">
            <select
              value={continueChId}
              onChange={(e) => setContinueChId(e.target.value)}
              className="w-full h-7 px-2 bg-panel-deep border border-line text-xs text-ink focus:border-accent focus:outline-none"
            >
              <option value="">-- 请选择前序章节 --</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {chapterLabel(c)} {c.title ? `· ${c.title}` : '(无标题)'}
                </option>
              ))}
            </select>
          </FieldGroup>
        )}

        <FieldGroup label="上下文">
          <div className="text-2xs text-ink-dim p-2 bg-panel-deep border border-line space-y-1">
            <div>世界观: {buildWorldBuildingContext(worldBuilding) ? '已配置' : '未配置'}</div>
            <div>最近章节摘要: 自动引用前3章</div>
            <div>角色状态: 自动引用上一章</div>
          </div>
        </FieldGroup>

        <FieldGroup label="补充指令">
          <textarea
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            className="w-full h-20 p-2 bg-panel-deep border border-line text-xs text-ink resize-none focus:border-accent focus:outline-none"
            placeholder="额外要求..."
          />
        </FieldGroup>

        <button
          onClick={handleGenerate}
          disabled={loading || !canGenerate}
          className="w-full h-8 bg-accent text-white text-xs hover:bg-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '生成中...' : genRange === 'all' ? '批量生成全部章节' : '生成单章故事'}
        </button>

        {streamText && (
          <div className="p-2 bg-panel-deep border border-line text-2xs text-ink-mute max-h-40 overflow-auto whitespace-pre-wrap">
            {streamText}
          </div>
        )}

        <StatusBlock model={provider?.name ?? '未配置'} info={tokenInfo} />
      </div>
    </>
  )
}

// ===== 分镜阶段: AI 分镜描述生成 =====
function StoryboardAI() {
  const { assets, providers, acts, chapters, selectedChapterId, importShots, shots, updateShot, updateChapter, visualStyle, setVisualStyle } = useProject()
  const { enqueue } = useGenerate()
  const llmProviders = providers.filter((p) => p.kind === 'llm' && p.enabled)
  const imageProviders = providers.filter((p) => p.kind === 'image' && p.enabled)
  const videoProviders = providers.filter((p) => p.kind === 'video' && p.enabled)

  const [llmProviderId, setLlmProviderIdState] = useState<string>(() => localStorage.getItem('lumen.storyboard.llmProviderId') || '')
  const [imageProviderId, setImageProviderIdState] = useState<string>(() => localStorage.getItem('lumen.storyboard.imageProviderId') || '')
  const [videoProviderId, setVideoProviderIdState] = useState<string>(() => localStorage.getItem('lumen.storyboard.videoProviderId') || '')

  const setLlmProviderId = (id: string) => {
    setLlmProviderIdState(id)
    localStorage.setItem('lumen.storyboard.llmProviderId', id)
  }
  const setImageProviderId = (id: string) => {
    setImageProviderIdState(id)
    localStorage.setItem('lumen.storyboard.imageProviderId', id)
  }
  const setVideoProviderId = (id: string) => {
    setVideoProviderIdState(id)
    localStorage.setItem('lumen.storyboard.videoProviderId', id)
  }

  const [extra, setExtra] = useState('')
  const [loading, setLoading] = useState(false)
  const [tokenInfo, setTokenInfo] = useState('--')
  const abortRef = useRef<AbortController | null>(null)

  const llmProvider = llmProviders.find((p) => p.id === llmProviderId) ?? llmProviders[0]
  const imageProvider = imageProviders.find((p) => p.id === imageProviderId) ?? imageProviders[0]
  const videoProvider = videoProviders.find((p) => p.id === videoProviderId) ?? videoProviders[0]
  const ch = chapters.find((c) => c.id === selectedChapterId)
  const parentAct = ch ? acts.find((a) => a.id === ch.actId) : undefined

  const handleGenerateFullStoryboard = useCallback(async () => {
    if (!llmProvider || !ch || !ch.synopsis) return
    setLoading(true)
    setTokenInfo('正在生成全集分镜...')
    abortRef.current = new AbortController()

    let chapterShots = shots.filter((s) => s.chapterId === ch.id)

    try {
      // 1. 如果当前章还没有任何分镜，先进行自动拆分
      if (chapterShots.length === 0) {
        setTokenInfo('正在拆分章节并生成分镜...')
        const messages = PROMPTS.splitToShots(ch.synopsis, extra, visualStyle)
        const result = await chatCompletion({
          provider: llmProvider,
          messages,
          temperature: 0.6,
          maxTokens: 8192,
          signal: abortRef.current.signal
        })

        const cleaned = result.content.replace(/```json\n?|```/g, '').trim()
        const parsed = safeJsonParse(cleaned) as Array<{
          scene: string
          characters: string[]
          action: string
          dialogue: string
          camera: string
          visualPrompt: string
          duration: number
        }>

        if (Array.isArray(parsed) && parsed.length > 0) {
          const shotItems = parsed.map((item) => ({
            id: Math.random().toString(36).slice(2, 10),
            scene: item.scene || '',
            characters: item.characters || [],
            action: item.action || '',
            dialogue: item.dialogue || '',
            camera: (['wide', 'medium', 'close-up', 'over-shoulder', 'pov', 'aerial', 'tracking'].includes(item.camera) ? item.camera : 'medium') as Shot['camera'],
            visualPrompt: item.visualPrompt || '',
            duration: item.duration || 3
          }))
          
          importShots(ch.id, shotItems)
          chapterShots = shotItems as Shot[]
          setTokenInfo(`分镜生成成功！共拆分 ${parsed.length} 个镜头`)
        } else {
          throw new Error('分镜拆分失败，格式不正确')
        }
      } else {
        // 2. 如果已经有分镜，则对缺失 visualPrompt 的分镜补充生成 prompt
        setTokenInfo('正在检查并补充画面描述...')
        let fillCount = 0
        for (const shot of chapterShots) {
          if (!shot.visualPrompt && (shot.scene || shot.action)) {
            const matchedScene = assets.find(a => a.category === 'scene' && (a.id === shot.sceneAssetId || a.name === shot.scene))
            const matchedChars = assets.filter(a => a.category === 'character' && (shot.characterAssetIds?.includes(a.id) || shot.characters.includes(a.name)))
            
            const messages = PROMPTS.generateVisualPrompt({
              scene: shot.scene,
              sceneDescription: matchedScene?.description || '',
              characters: shot.characters,
              characterProfiles: matchedChars.map(c => ({
                name: c.name,
                appearance: c.character?.appearance || '',
                outfit: c.character?.outfit || ''
              })),
              action: shot.action,
              dialogue: shot.dialogue,
              camera: shot.camera
            }, visualStyle)
            const result = await chatCompletion({
              provider: llmProvider,
              messages,
              maxTokens: 512,
              temperature: 0.7
            })
            updateShot(shot.id, { visualPrompt: result.content.trim() })
            fillCount++
          }
        }
        setTokenInfo(`检查完毕！补充了 ${fillCount} 个镜头的画面描述，共 ${chapterShots.length} 个镜头`)
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setTokenInfo(`错误: ${err instanceof Error ? err.message.slice(0, 50) : '未知'}`)
    } finally {
      setLoading(false)
    }
  }, [llmProvider, ch, extra, visualStyle, shots, importShots, updateShot, assets])

  const handleGenerateFullStoryboardImages = useCallback(async () => {
    if (!llmProvider || !ch) return
    setLoading(true)
    setTokenInfo('正在生成全集分镜画面...')
    abortRef.current = new AbortController()

    let chapterShots = shots.filter((s) => s.chapterId === ch.id)

    try {
      // 1. 如果甚至还没有分镜，先警告用户
      if (chapterShots.length === 0) {
        setTokenInfo('请先点击 生成全集分镜！')
        return
      }

      // 2. 检查是否有缺失 visualPrompt 文本的分镜，先补全它
      setTokenInfo('正在检查并补充未生成的画面描述...')
      let fillCount = 0
      for (const shot of chapterShots) {
        if (!shot.visualPrompt && (shot.scene || shot.action)) {
          const matchedScene = assets.find(a => a.category === 'scene' && (a.id === shot.sceneAssetId || a.name === shot.scene))
          const matchedChars = assets.filter(a => a.category === 'character' && (shot.characterAssetIds?.includes(a.id) || shot.characters.includes(a.name)))
          
          const messages = PROMPTS.generateVisualPrompt({
            scene: shot.scene,
            sceneDescription: matchedScene?.description || '',
            characters: shot.characters,
            characterProfiles: matchedChars.map(c => ({
              name: c.name,
              appearance: c.character?.appearance || '',
              outfit: c.character?.outfit || ''
            })),
            action: shot.action,
            dialogue: shot.dialogue,
            camera: shot.camera
          }, visualStyle)
          
          const result = await chatCompletion({
            provider: llmProvider,
            messages,
            maxTokens: 512,
            temperature: 0.7
          })
          updateShot(shot.id, { visualPrompt: result.content.trim() })
          fillCount++
        }
      }

      // 3. 一键加入生图队列
      setTokenInfo('正在将所有分镜加入渲染队列...')
      let queuedCount = 0
      for (const shot of chapterShots) {
        if (!shot.imagePath) {
          enqueue('image', { shotId: shot.id })
          queuedCount++
        }
      }
      setTokenInfo(`分镜画面已全部加入生图队列！共启动了 ${queuedCount} 个生图任务`)
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setTokenInfo(`错误: ${err instanceof Error ? err.message.slice(0, 50) : '未知'}`)
    } finally {
      setLoading(false)
    }
  }, [llmProvider, ch, visualStyle, shots, updateShot, enqueue, assets])

  return (
    <>
      <PanelHeader title="AI 分镜" />
      <div className="flex-1 overflow-auto p-3 space-y-3">
        <FieldGroup label="关联节点">
          <div className="text-2xs text-ink p-2 bg-panel-deep border border-line space-y-1">
            {ch ? (
              <>
                <div><span className="text-ink-dim">故事点: </span>{parentAct ? `${parentAct.index} · ${parentAct.title}` : '未关联'}</div>
                <div><span className="text-ink-dim">章节: </span>{chapterLabel(ch)} {ch.title || '未命名章节'}</div>
              </>
            ) : (
              <span className="text-ink-dim">请先在左侧选择章节</span>
            )}
          </div>
        </FieldGroup>
        <FieldGroup label="LLM Provider">
          <ProviderSelect
            providers={llmProviders}
            value={llmProviderId}
            onChange={setLlmProviderId}
            placeholder="请先在设置中添加 LLM"
          />
        </FieldGroup>

        <FieldGroup label="操作">
          <div className="space-y-1.5">
            <button
              onClick={handleGenerateFullStoryboard}
              disabled={loading || !llmProvider || !ch?.synopsis}
              className="w-full h-8 bg-accent text-white text-xs font-semibold hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '生成分镜中...' : '生成全集分镜'}
            </button>
            <button
              onClick={handleGenerateFullStoryboardImages}
              disabled={loading || !llmProvider || !ch}
              className="w-full h-8 bg-accent text-white text-xs font-semibold hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '生成分镜画面中...' : '生成全集分镜画面'}
            </button>
          </div>
        </FieldGroup>

        <FieldGroup label="画面风格">
          <select
            value={visualStyle || 'realistic'}
            onChange={(e) => setVisualStyle(e.target.value)}
            className="w-full h-7 px-2 bg-panel-deep border border-line text-xs text-ink focus:border-accent focus:outline-none"
          >
            <option value="realistic">写实 (Realistic)</option>
            <option value="anime">动漫 (Anime)</option>
            <option value="ink">水墨 (Ink)</option>
            <option value="cyberpunk">赛博朋克 (Cyberpunk)</option>
            <option value="custom">自定义</option>
          </select>
        </FieldGroup>

        <FieldGroup label="生图模型">
          <ProviderSelect
            providers={imageProviders}
            value={imageProviderId}
            onChange={setImageProviderId}
            placeholder="请先在设置中添加图像模型"
          />
        </FieldGroup>

        <FieldGroup label="视频模型">
          <ProviderSelect
            providers={videoProviders}
            value={videoProviderId}
            onChange={setVideoProviderId}
            placeholder="请先在设置中添加视频模型"
          />
        </FieldGroup>

        <FieldGroup label="补充指令">
          <textarea
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            className="w-full h-16 p-2 bg-panel-deep border border-line text-xs text-ink resize-none focus:border-accent focus:outline-none"
            placeholder="额外要求..."
          />
        </FieldGroup>

        <FieldGroup label="一致性参考">
          <div className="grid grid-cols-3 gap-1.5">
            <RefSlot 
              label="角色" 
              category="character" 
              value={ch?.characterRefId} 
              onSelect={(id) => ch && updateChapter(ch.id, { characterRefId: id || undefined })} 
              assets={assets}
            />
            <RefSlot 
              label="场景" 
              category="scene" 
              value={ch?.sceneRefId} 
              onSelect={(id) => ch && updateChapter(ch.id, { sceneRefId: id || undefined })} 
              assets={assets}
            />
            <RefSlot 
              label="道具" 
              category="prop" 
              value={ch?.propRefId} 
              onSelect={(id) => ch && updateChapter(ch.id, { propRefId: id || undefined })} 
              assets={assets}
            />
          </div>
          <div className="text-2xs text-ink-dim mt-1.5">
            从左侧素材库拖入或直接点击槽位选择素材
          </div>
        </FieldGroup>

        <StatusBlock model={`图: ${imageProvider?.name ?? '未配置'} | 视: ${videoProvider?.name ?? '未配置'}`} info={tokenInfo} />
      </div>
    </>
  )
}

// ===== 生成阶段: 视频生成控制 =====
function GenerateControls() {
  const { providers } = useProject()
  const { tasks } = useGenerate()
  const videoProviders = providers.filter((p) => p.kind === 'video' && p.enabled)
  const ttsProviders = providers.filter((p) => p.kind === 'tts' && p.enabled)
  const [videoProviderId, setVideoProviderId] = useState<string>('')
  const [ttsProviderId, setTtsProviderId] = useState<string>('')
  const [resolution, setResolution] = useState('1080p')
  const [fps, setFps] = useState('24fps')

  const videoProvider = videoProviders.find((p) => p.id === videoProviderId) ?? videoProviders[0]
  const ttsProvider = ttsProviders.find((p) => p.id === ttsProviderId) ?? ttsProviders[0]
  void ttsProvider

  const runningCount = tasks.filter((t) => t.status === 'running').length
  const queuedCount = tasks.filter((t) => t.status === 'queued').length

  return (
    <>
      <PanelHeader title="生成控制" />
      <div className="flex-1 overflow-auto p-3 space-y-3">
        <FieldGroup label="I2V 模型">
          <ProviderSelect
            providers={videoProviders}
            value={videoProviderId}
            onChange={setVideoProviderId}
            placeholder="请先在设置中添加视频模型"
          />
        </FieldGroup>

        <FieldGroup label="TTS 模型">
          <ProviderSelect
            providers={ttsProviders}
            value={ttsProviderId}
            onChange={setTtsProviderId}
            placeholder="请先在设置中添加 TTS"
          />
        </FieldGroup>

        <FieldGroup label="输出设置">
          <div className="grid grid-cols-2 gap-2">
            <MiniSelect label="分辨率" value={resolution} onChange={setResolution} options={['1080p', '720p', '4K']} />
            <MiniSelect label="帧率" value={fps} onChange={setFps} options={['24fps', '30fps', '60fps']} />
          </div>
        </FieldGroup>

        <div className="border-t border-line pt-3 space-y-1.5">
          <button
            disabled={!videoProvider}
            className="w-full h-8 bg-accent text-white text-xs hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            生成全部镜头视频
          </button>
          <button className="w-full h-7 bg-panel-deep border border-line text-xs text-ink hover:bg-panel-hover">
            仅生成当前镜头
          </button>
          <button className="w-full h-7 bg-panel-deep border border-line text-xs text-ink hover:bg-panel-hover">
            拼接导出
          </button>
        </div>

        {(runningCount > 0 || queuedCount > 0) && (
          <div className="text-2xs text-ink-dim p-2 bg-panel-deep border border-line">
            运行中: {runningCount} | 排队: {queuedCount}
          </div>
        )}

        <StatusBlock model={videoProvider?.name ?? '未配置'} info={`GPU --`} />
      </div>
    </>
  )
}

// ===== 通用组件 =====
function PanelHeader({ title }: { title: string }) {
  return (
    <div className="h-7 shrink-0 flex items-center px-3 bg-panel-raised border-b border-line text-2xs tracking-wide text-ink-mute font-medium">
      {title}
    </div>
  )
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs text-ink-dim mb-1.5">{label}</div>
      {children}
    </div>
  )
}

function MiniSelect({ label, options, value, onChange }: {
  label: string
  options: string[]
  value?: string
  onChange?: (v: string) => void
}) {
  return (
    <div>
      <div className="text-2xs text-ink-dim mb-0.5">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full h-6 px-1.5 bg-panel-deep border border-line text-2xs text-ink focus:border-accent focus:outline-none"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function ProviderSelect({ providers, value, onChange, placeholder }: {
  providers: ModelProvider[]
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  if (providers.length === 0) {
    return (
      <div className="text-2xs text-ink-dim p-2 bg-panel-deep border border-line">
        {placeholder}
      </div>
    )
  }
  return (
    <select
      value={value || providers[0]?.id || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-7 px-2 bg-panel-deep border border-line text-xs text-ink focus:border-accent focus:outline-none"
    >
      {providers.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name} {p.defaultModel ? `(${p.defaultModel})` : ''}
        </option>
      ))}
    </select>
  )
}

const isElectron = !!(window as unknown as { lumen?: unknown }).lumen

function toMediaSrc(path: string | undefined): string {
  if (!path) return ''
  if (isElectron) return path.replace(/^file:\/\/\//, 'lumen-media:///')
  const name = path.replace(/\\/g, '/').split('/').pop() || ''
  return `lumen-media:///${name}`
}

interface RefSlotProps {
  label: string
  category: 'character' | 'scene' | 'prop'
  value?: string
  onSelect: (id: string | null) => void
  assets: any[]
}

function RefSlot({ label, category, value, onSelect, assets }: RefSlotProps) {
  const [dragOver, setDragOver] = useState(false)
  const boundAsset = value ? assets.find((a) => a.id === value) : null
  const pic = boundAsset?.views?.sheetPath || boundAsset?.views?.front || boundAsset?.views?.side || boundAsset?.thumbnail

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    try {
      const dataStr = e.dataTransfer.getData('text/plain')
      if (!dataStr) return
      const data = JSON.parse(dataStr)
      if (data.category === category) {
        onSelect(data.id)
      } else {
        console.warn(`[RefSlot] Category mismatch: expected ${category}, got ${data.category}`)
      }
    } catch (err) {
      console.error('[RefSlot] drop parsing failed:', err)
    }
  }

  const availableAssets = assets.filter((a) => a.category === category)

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`aspect-square rounded-sm border flex flex-col items-center justify-center relative overflow-hidden transition-all select-none ${
        dragOver 
          ? 'border-accent bg-accent/10 scale-[1.02] shadow-md' 
          : boundAsset 
            ? 'border-line bg-panel-deep' 
            : 'border-dashed border-line bg-panel-deep hover:border-line-hover cursor-pointer'
      }`}
    >
      {boundAsset ? (
        <>
          {pic ? (
            <img src={toMediaSrc(pic)} className="w-full h-full object-cover" alt={boundAsset.name} />
          ) : (
            <div className="w-full h-full bg-accent/5 flex items-center justify-center text-sm font-bold text-accent">
              {boundAsset.name.slice(0, 1)}
            </div>
          )}
          
          {/* Label overlay */}
          <div className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 px-1 text-center">
            <p className="text-[9px] text-ink font-semibold truncate leading-tight select-none">{boundAsset.name}</p>
          </div>

          {/* Delete/Remove Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onSelect(null)
            }}
            className="absolute top-1 right-1 w-3.5 h-3.5 bg-black/70 hover:bg-accent-danger text-white rounded-full flex items-center justify-center text-[10px] font-extrabold transition-colors z-20 cursor-pointer"
            title={`清除${label}参考`}
          >
            ×
          </button>
        </>
      ) : (
        <>
          <span className="text-[15px] mb-1 select-none">
            {category === 'character' ? '👥' : category === 'scene' ? '🏙️' : '🗡️'}
          </span>
          <span className="text-[10px] text-ink-dim select-none font-bold">{label}</span>
          
          {/* Hidden click fallback select menu */}
          <select
            value=""
            onChange={(e) => {
              const id = e.target.value
              if (id) onSelect(id)
            }}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
            title={`点击或拖入以选择一致性${label}`}
          >
            <option value="" disabled>选择{label}...</option>
            {availableAssets.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </>
      )}
    </div>
  )
}

function StatusBlock({ model, info }: { model: string; info: string }) {
  return (
    <div className="border-t border-line pt-2 mt-2">
      <div className="flex justify-between text-2xs text-ink-dim">
        <span>模型: {model}</span>
        <span>{info}</span>
      </div>
    </div>
  )
}
