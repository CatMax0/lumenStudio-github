import { useState, useEffect } from 'react'
import { useStage } from '../store/stage'
import { useProject } from '../store/project'
import { useGenerate } from '../store/generate'
import { CAMERA_LABELS, chapterLabel } from '../types/project'
import type { OutlineNode, Shot, WorldBuilding } from '../types/project'
import { RefTextArea } from '../components/RefTextArea'
import { LibraryWorkspace } from '../components/LibraryWorkspace'
import { SettingsWorkspace } from '../components/SettingsWorkspace'
import { ProjectsWorkspace } from '../components/ProjectsWorkspace'

const isElectron = !!(window as unknown as { lumen?: unknown }).lumen

function toMediaSrc(path: string | undefined): string {
  if (!path) return ''
  // Electron: use lumen-media:// protocol
  if (isElectron) return path.replace(/^file:\/\/\//, 'lumen-media:///')
  // Browser: extract filename and serve via /media/
  const name = path.replace(/\\/g, '/').split('/').pop() || ''
  return `/media/${name}`
}

export function CenterPanel() {
  const { stage } = useStage()

  return (
    <main className="flex-1 min-w-0 flex flex-col bg-panel-deep">
      {stage === 'projects' && <ProjectsWorkspace />}
      {stage === 'worldbuilding' && <WorldBuildingWorkspace />}
      {stage === 'outline' && <OutlineWorkspace />}
      {stage === 'chapter' && <ChapterWorkspace />}
      {stage === 'storyboard' && <StoryboardWorkspace />}
      {stage === 'generate' && <GenerateWorkspace />}
      {stage === 'library' && <LibraryWorkspace />}
      {stage === 'settings' && <SettingsWorkspace />}
    </main>
  )
}

// ===== 世界观工作区 =====
const WB_FIELDS: { key: keyof WorldBuilding; label: string; rows: number; placeholder: string }[] = [
  { key: 'worldview', label: '世界观', rows: 5, placeholder: '故事的世界背景设定、规则、力量体系与核心剧情发展线...' },
  { key: 'characters', label: '角色设定', rows: 5, placeholder: '主要角色的姓名、身份、外貌、性格，以及人物之间的关系网...' },
  { key: 'setting', label: '场景与道具', rows: 4, placeholder: '故事中的关键场景（环境、氛围）与重要道具（外观、功能）...' },
  { key: 'style', label: '风格与叙事', rows: 3, placeholder: '文风特点、叙事视角规则、镜头运镜风格...' },
  { key: 'constraints', label: '限制与节奏', rows: 3, placeholder: '不应出现的词汇表达，以及剧情的节奏要求...' }
]

function WorldBuildingWorkspace() {
  const { worldBuilding, updateWorldBuilding, theme, setTheme, genre, setGenre } = useProject()

  return (
    <>
      <WorkspaceHeader title="故事背景" subtitle="定义故事核心梗概, 角色/场景/道具将自动提取为素材库资产" />
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-3xl space-y-4">
          <FieldGroup label="故事主题">
            <textarea
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full h-20 p-3 bg-panel border border-line text-xs text-ink resize-none focus:border-accent focus:outline-none"
              placeholder="输入故事主题、核心冲突、目标受众..."
            />
          </FieldGroup>

          <div className="grid grid-cols-2 gap-3">
            <FieldGroup label="题材">
              <input
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full h-7 px-2 bg-panel border border-line text-xs text-ink focus:border-accent focus:outline-none"
                placeholder="都市 / 古风 / 玄幻 / 科幻..."
              />
            </FieldGroup>
            <FieldGroup label="节奏">
              <select
                value={worldBuilding.pace}
                onChange={(e) => updateWorldBuilding({ pace: e.target.value })}
                className="w-full h-7 px-2 bg-panel border border-line text-xs text-ink focus:border-accent focus:outline-none"
              >
                <option value="快节奏">快节奏 (短剧爽感)</option>
                <option value="中节奏">中节奏 (情节饱满)</option>
                <option value="慢节奏">慢节奏 (氛围铺陈)</option>
              </select>
            </FieldGroup>
          </div>

          {WB_FIELDS.map((f) => (
            <FieldGroup key={f.key} label={f.label}>
              <textarea
                value={worldBuilding[f.key]}
                onChange={(e) => updateWorldBuilding({ [f.key]: e.target.value })}
                rows={f.rows}
                className="w-full p-3 bg-panel border border-line text-xs text-ink resize-none focus:border-accent focus:outline-none"
                placeholder={f.placeholder}
              />
            </FieldGroup>
          ))}
        </div>
      </div>
    </>
  )
}

// ===== 大纲工作区 =====
function OutlineWorkspace() {
  const { acts, addAct, updateAct, removeAct } = useProject()

  return (
    <>
      <WorkspaceHeader title="大纲编辑" subtitle={`故事发展路线 (${acts.length} 个故事点)`} />
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-3xl space-y-3">
          <div className="text-2xs text-ink-dim mb-2">大纲是故事的发展路线, 每个“故事点”是一个叙事节点 (如西游记的81难), 不限制集数或时长</div>
          {acts.map((a) => (
            <OutlineBlock
              key={a.id}
              act={a}
              onUpdate={(patch) => updateAct(a.id, patch)}
              onRemove={() => removeAct(a.id)}
            />
          ))}
          <button
            onClick={addAct}
            className="w-full h-9 border border-dashed border-line text-xs text-ink-dim hover:border-ink-mute hover:text-ink-mute"
          >
            + 新增故事点
          </button>
        </div>
      </div>
    </>
  )
}

function OutlineBlock({
  act, onUpdate, onRemove
}: {
  act: OutlineNode
  onUpdate: (patch: Partial<OutlineNode>) => void
  onRemove: () => void
}) {
  return (
    <div className="border border-line bg-panel p-3 group">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xs font-mono text-accent w-6 shrink-0">{act.index}</span>
        <input
          value={act.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="flex-1 text-xs text-ink bg-transparent border-b border-transparent hover:border-line focus:border-accent focus:outline-none py-0.5"
          placeholder="故事点标题"
        />
        <button
          onClick={onRemove}
          className="text-2xs text-ink-dim hover:text-accent-danger opacity-0 group-hover:opacity-100"
        >
          删除
        </button>
      </div>
      <RefTextArea
        value={act.summary}
        onChange={(v) => onUpdate({ summary: v })}
        rows={3}
        placeholder="本故事点剧情摘要..."
      />
      <div className="mt-2">
        <input
          value={act.goal}
          onChange={(e) => onUpdate({ goal: e.target.value })}
          className="w-full h-6 px-2 bg-panel-deep border border-line text-2xs text-ink focus:border-accent focus:outline-none"
          placeholder="本故事点目标: 达成什么叙事目的?"
        />
      </div>
    </div>
  )
}

// ===== 章节工作区 =====
function ChapterWorkspace() {
  const { chapters, acts, selectedChapterId, updateChapter, addChapter } = useProject()
  const ch = chapters.find((c) => c.id === selectedChapterId)

  if (!ch) {
    return (
      <>
        <WorkspaceHeader title="章节故事" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-ink-dim">
            <div className="text-sm mb-2">尚未选择章节</div>
            <button
              onClick={() => addChapter()}
              className="h-8 px-4 bg-accent text-white text-xs hover:bg-accent/80"
            >
              + 新建第一章
            </button>
          </div>
        </div>
      </>
    )
  }

  const act = acts.find((a) => a.id === ch.actId)
  const label = chapterLabel(ch)

  return (
    <>
      <WorkspaceHeader
        title="章节故事"
        subtitle={`${label} ${act ? `· ${act.title}` : ''}`}
      />
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-3xl space-y-4">
          {act && (
            <div className="px-3 py-2 bg-accent/5 border border-accent/20 text-2xs text-ink-mute">
              <span className="text-accent font-mono mr-2">{act.index}</span>
              <span className="font-medium text-ink">{act.title}</span>
              {act.goal && <span className="ml-2 text-ink-dim">· {act.goal}</span>}
            </div>
          )}

          <FieldGroup label="章节标题">
            <input
              value={ch.title}
              onChange={(e) => updateChapter(ch.id, { title: e.target.value })}
              className="w-full h-8 px-3 bg-panel border border-line text-sm text-ink focus:border-accent focus:outline-none"
              placeholder="输入章节标题"
            />
          </FieldGroup>

          <FieldGroup label="故事内容">
            <RefTextArea
              value={ch.synopsis}
              onChange={(v) => updateChapter(ch.id, { synopsis: v })}
              rows={14}
              className="leading-relaxed"
              placeholder={'描述本章节的完整故事...\n\n包含: 场景 / 人物 / 对白 / 动作 / 情感变化'}
            />
          </FieldGroup>

          <FieldGroup label="本章摘要 (供后续章节参考)">
            <RefTextArea
              value={ch.chapterSummary}
              onChange={(v) => updateChapter(ch.id, { chapterSummary: v })}
              rows={4}
              showRefs={true}
              placeholder="本章核心事件概述, 用于后续章节的上下文"
            />
          </FieldGroup>
        </div>
      </div>
    </>
  )
}

// ===== 统一的分镜脚本卡片 (包含所有配置与媒体预览) =====
interface StoryboardRowCardProps {
  shot: Shot
  active: boolean
  onSelect: () => void
  onUpdate: (patch: Partial<Shot>) => void
  onRemove: () => void
  hasImageProvider: boolean
  hasVideoProvider: boolean
  isGenerating: boolean
  isVideoGenerating: boolean
  shotTask?: any
  videoTask?: any
  enqueue: any
  assets: any[]
  providers: any[]
}

function StoryboardRowCard({
  shot,
  active,
  onSelect,
  onUpdate,
  onRemove,
  hasImageProvider,
  hasVideoProvider,
  isGenerating,
  isVideoGenerating,
  shotTask,
  videoTask,
  enqueue,
  assets,
  providers
}: StoryboardRowCardProps) {
  const boundScene = assets.find(
    (a) => a.category === 'scene' && (a.id === shot.sceneAssetId || a.name === shot.scene)
  )
  const scenePic = boundScene?.panoramaPath || boundScene?.views?.sheetPath || boundScene?.views?.front

  const handleGenerateImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!hasImageProvider || isGenerating) return
    const pId = localStorage.getItem('lumen.storyboard.imageProviderId') || undefined
    enqueue('image', { shotId: shot.id, providerId: pId })
  }

  const handleGenerateVideo = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!hasVideoProvider || isVideoGenerating) return
    const pId = localStorage.getItem('lumen.storyboard.videoProviderId') || undefined
    enqueue('video', { shotId: shot.id, providerId: pId })
  }

  const handleImportImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    const file = e.target.files?.[0]
    if (!file) return
    const localPath = (file as any).path || ""
    if (localPath) {
      const formattedPath = `lumen-media:///${localPath.replace(/\\/g, '/')}`
      onUpdate({ imagePath: formattedPath })
    } else {
      const fallbackUrl = URL.createObjectURL(file)
      onUpdate({ imagePath: fallbackUrl })
    }
  }

  const handleImportVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    const file = e.target.files?.[0]
    if (!file) return
    const localPath = (file as any).path || ""
    if (localPath) {
      const formattedPath = `lumen-media:///${localPath.replace(/\\/g, '/')}`
      onUpdate({ videoPath: formattedPath })
    } else {
      const fallbackUrl = URL.createObjectURL(file)
      onUpdate({ videoPath: fallbackUrl })
    }
  }

  // Parse mentioned assets from shot.action
  const actionText = shot.action || ''
  const mentionedNames = Array.from(actionText.matchAll(/\{\{([^}]+)\}\}/g)).map(m => m[1].trim())
  const mentionedAssets = mentionedNames.map(name => {
    const matched = assets.find(a => a.name === name)
    return matched ? { id: matched.id, name: matched.name, category: matched.category } : { id: name, name: name, category: 'custom' }
  })
  const uniqueMentionedAssets = mentionedAssets.filter((asset, index, self) => 
    self.findIndex(a => a.name === asset.name) === index
  )

  return (
    <div 
      onClick={onSelect}
      className={`group p-4 bg-panel border ${
        active ? 'border-accent shadow-sm ring-1 ring-accent/30 bg-accent/2' : 'border-line'
      } hover:border-line-hover rounded-md flex flex-row gap-5 transition-all duration-200 cursor-pointer h-auto w-full relative`}
    >
      {/* 1. 左侧：参数控制列 (总是可见，包含所有设置) */}
      <div className="w-72 md:w-80 shrink-0 border-r border-line/60 pr-5 flex flex-col gap-3 select-text" onClick={(e) => e.stopPropagation()}>
        {/* 头部：镜头号, 运镜, 时长, 删除 */}
        <div className="flex items-center justify-between gap-2 border-b border-line/50 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold font-mono text-accent">
              #{shot.index}
            </span>
            
            {/* 运镜选择 */}
            <select
              value={shot.camera}
              onChange={(e) => onUpdate({ camera: e.target.value as Shot['camera'] })}
              className="h-6 px-1.5 bg-panel-deep border border-line text-2xs text-ink focus:border-accent focus:outline-none rounded-sm cursor-pointer font-semibold"
            >
              {Object.entries(CAMERA_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            {/* 时长编辑 */}
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                value={shot.duration}
                onChange={(e) => onUpdate({ duration: parseFloat(e.target.value) || 0 })}
                className="w-12 h-6 text-center bg-panel-deep border border-line text-xs font-mono text-ink focus:border-accent focus:outline-none rounded-sm"
              />
              <span className="text-2xs text-ink-dim font-bold">秒</span>
            </div>

            {/* 删除镜头 */}
            <button
              onClick={() => onRemove()}
              className="text-2xs text-accent-danger hover:underline font-bold"
              title="删除此分镜"
            >
              删除
            </button>
          </div>
        </div>

        {/* 场景环境配置 */}
        <div className="space-y-1">
          <label className="block text-2xs text-ink-dim font-bold">🏙️ 关联场景</label>
          <select
            value={shot.sceneAssetId || ''}
            onChange={(e) => {
              const assetId = e.target.value
              const sAsset = assets.find((a) => a.id === assetId)
              onUpdate({ 
                sceneAssetId: assetId,
                scene: sAsset ? sAsset.name : ''
              })
            }}
            className="w-full h-7 px-2 bg-panel-deep border border-line text-xs text-ink focus:border-accent focus:outline-none rounded-sm cursor-pointer"
          >
            <option value="">-- 未关联场景 --</option>
            {assets.filter((a) => a.category === 'scene').map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          {/* 场景文本手动输入 (如果未关联或需要手动覆盖) */}
          {!shot.sceneAssetId && (
            <input
              value={shot.scene || ''}
              onChange={(e) => onUpdate({ scene: e.target.value })}
              placeholder="自定义场景环境名称..."
              className="w-full h-7 px-2 bg-panel-deep border border-line text-xs text-ink focus:border-accent focus:outline-none rounded-sm"
            />
          )}
        </div>

        {/* 登场人物：自动显示在动作描述中引入的标签 */}
        <div className="space-y-1">
          <label className="block text-2xs text-ink-dim font-bold">👥 登场素材 (人物/场景/道具)</label>
          <div className="flex flex-wrap gap-1.5 p-2 bg-panel-deep border border-line rounded-sm min-h-[44px]">
            {uniqueMentionedAssets.map((asset) => {
              let icon = '🏷️'
              let colorClasses = 'bg-panel-raised text-ink-dim border-line'
              
              if (asset.category === 'character') {
                icon = '👤'
                colorClasses = 'bg-accent/10 text-accent border-accent/20'
              } else if (asset.category === 'scene') {
                icon = '🏙️'
                colorClasses = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
              } else if (asset.category === 'prop') {
                icon = '📦'
                colorClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }

              return (
                <span 
                  key={asset.id} 
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border text-[10px] font-semibold ${colorClasses}`}
                >
                  <span>{icon}</span>
                  <span>{asset.name}</span>
                </span>
              )
            })}
            {uniqueMentionedAssets.length === 0 && (
              <div className="text-[10px] text-ink-dim py-1 leading-relaxed">
                在动作描述中用 <span className="font-mono text-accent">{"{{素材名称}}"}</span> 引入人物、场景或道具
              </div>
            )}
          </div>
        </div>

        {/* AI 提示词配置 (带智能生成按钮) */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="block text-2xs text-ink-dim font-bold">✨ AI 生图提示词 (Prompt)</label>
            <button
              onClick={async () => {
                const llmProvider = providers.find((p) => p.kind === 'llm' && p.enabled)
                if (!llmProvider || (!shot.scene && !shot.action)) return
                try {
                  const { chatCompletion: chat, PROMPTS } = await import('../services/ai')
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
                  }, '')
                  const result = await chat({ provider: llmProvider, messages, maxTokens: 512, temperature: 0.7 })
                  onUpdate({ visualPrompt: result.content.trim() })
                } catch (err) {
                  console.error('[StoryboardRowCard] failed to auto prompt:', err)
                  alert(err instanceof Error ? err.message : '生成失败')
                }
              }}
              className="text-[10px] text-accent hover:underline flex items-center gap-0.5 font-bold"
            >
              智能生成 ⚡
            </button>
          </div>
          <textarea
            value={shot.visualPrompt || ''}
            onChange={(e) => onUpdate({ visualPrompt: e.target.value })}
            rows={2.5}
            className="w-full p-1.5 bg-panel-deep border border-line text-2xs text-ink resize-none focus:border-accent focus:outline-none rounded-sm font-mono leading-relaxed"
            placeholder="AI 生图画面描述词..."
          />
        </div>
      </div>

      {/* 2. 右侧：画幅预览与动作对白区 (自适应填充) */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <div className="flex flex-row items-stretch justify-start gap-4">
          {/* 2.1 场景参考图 (16:9) */}
          <div className="flex-1 h-32 md:h-40 aspect-video min-w-0 bg-panel-deep border border-line rounded-sm flex flex-col items-center justify-center relative overflow-hidden group/scene">
            {scenePic ? (
              <>
                <img src={toMediaSrc(scenePic)} className="w-full h-full object-contain" alt="场景图" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/scene:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="text-[10px] text-white font-medium bg-black/40 px-2 py-1 rounded-[2px]">🏙️ 场景: {shot.scene || '已绑场景'}</span>
                </div>
              </>
            ) : (
              <div className="p-2 text-center flex flex-col items-center justify-center text-ink-dim gap-1.5 w-full h-full bg-panel-deep">
                <span className="text-2xs font-semibold text-ink-mute">🏙️ 场景参考</span>
                <span className="text-[9px] scale-90">未绑定场景素材</span>
              </div>
            )}
          </div>

          {/* 2.2 分镜图 (16:9) */}
          <div className="flex-1 h-32 md:h-40 aspect-video min-w-0 bg-panel-deep border border-line rounded-sm flex flex-col items-center justify-center relative overflow-hidden group/media">
            {shot.imagePath ? (
              <>
                <img src={toMediaSrc(shot.imagePath)} className="w-full h-full object-contain" alt="分镜图" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/media:opacity-100 flex flex-col items-center justify-center transition-opacity gap-1.5 p-1 z-10">
                  <button
                    onClick={handleGenerateImage}
                    disabled={!hasImageProvider || isGenerating}
                    className="h-5 w-24 bg-accent hover:bg-accent/80 text-[10px] text-white rounded-sm disabled:opacity-50 font-medium shrink-0"
                  >
                    重新生成画面
                  </button>
                  <label className="h-5 w-24 bg-panel border border-line hover:bg-panel-hover text-[10px] text-ink rounded-sm flex items-center justify-center cursor-pointer font-medium shrink-0">
                    导入本地图...
                    <input type="file" accept="image/*" className="hidden" onClick={(e) => e.stopPropagation()} onChange={handleImportImage} />
                  </label>
                </div>
              </>
            ) : (
              <div className="p-2 text-center flex flex-col items-center justify-center gap-1.5 w-full h-full">
                <span className="text-2xs font-semibold text-ink-mute">✨ 概念分镜图</span>
                <div className="flex flex-col gap-1 w-24 shrink-0 mt-1">
                  <button
                    onClick={handleGenerateImage}
                    disabled={!hasImageProvider || isGenerating || !shot.visualPrompt}
                    className="h-5 bg-accent hover:bg-accent/80 disabled:bg-panel border border-transparent disabled:border-line text-[9px] text-white disabled:text-ink-dim rounded-sm transition-colors shrink-0 font-medium"
                  >
                    {isGenerating ? '绘制中...' : '生成画面'}
                  </button>
                  <label className="h-5 bg-panel border border-line hover:bg-panel-hover text-[9px] text-ink rounded-sm flex items-center justify-center cursor-pointer shrink-0 font-medium">
                    导入本地图
                    <input type="file" accept="image/*" className="hidden" onClick={(e) => e.stopPropagation()} onChange={handleImportImage} />
                  </label>
                </div>
              </div>
            )}
            {isGenerating && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-[10px] text-white animate-pulse">AI 绘制中...</span>
              </div>
            )}
          </div>

          {/* 2.3 动态视频流 (16:9) */}
          <div className="flex-1 h-32 md:h-40 aspect-video min-w-0 bg-panel-deep border border-line rounded-sm flex flex-col items-center justify-center relative overflow-hidden group/media">
            {shot.videoPath ? (
              <>
                <video src={toMediaSrc(shot.videoPath)} className="w-full h-full object-contain" controls onClick={(e) => e.stopPropagation()} />
                <div className="absolute top-1 right-1 bg-black/50 px-1 py-0.5 rounded-[2px] text-[8px] text-white pointer-events-none">视频</div>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/media:opacity-100 flex flex-col items-center justify-center transition-opacity gap-1.5 p-1 pointer-events-none group-hover/media:pointer-events-auto z-10">
                  <button
                    onClick={handleGenerateVideo}
                    disabled={!hasVideoProvider || isVideoGenerating}
                    className="h-5 w-24 bg-accent hover:bg-accent/80 text-[10px] text-white rounded-sm disabled:opacity-50 font-medium shrink-0"
                  >
                    重新生成视频
                  </button>
                  <label className="h-5 w-24 bg-panel border border-line hover:bg-panel-hover text-[10px] text-ink rounded-sm flex items-center justify-center cursor-pointer font-medium shrink-0">
                    导入本地视频...
                    <input type="file" accept="video/*" className="hidden" onClick={(e) => e.stopPropagation()} onChange={handleImportVideo} />
                  </label>
                </div>
              </>
            ) : (
              <div className="p-2 text-center flex flex-col items-center justify-center gap-1.5 w-full h-full">
                <span className="text-2xs font-semibold text-ink-mute">📹 动态视频流</span>
                <div className="flex flex-col gap-1 w-24 shrink-0 mt-1">
                  <button
                    onClick={handleGenerateVideo}
                    disabled={!hasVideoProvider || isVideoGenerating || !shot.imagePath}
                    className="h-5 bg-panel border border-line hover:bg-panel-hover text-[9px] text-ink rounded-sm disabled:opacity-50 transition-colors shrink-0 font-medium"
                  >
                    {isVideoGenerating ? '生成中...' : '生成视频'}
                  </button>
                  <label className="h-5 bg-panel border border-line hover:bg-panel-hover text-[9px] text-ink rounded-sm flex items-center justify-center cursor-pointer shrink-0 font-medium">
                    导入本地视频
                    <input type="file" accept="video/*" className="hidden" onClick={(e) => e.stopPropagation()} onChange={handleImportVideo} />
                  </label>
                </div>
              </div>
            )}
            {isVideoGenerating && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-[10px] text-white animate-pulse">视频渲染中...</span>
              </div>
            )}
          </div>
        </div>

        {/* 2.4 事件与台词文本编辑 */}
        <div className="flex-1 flex flex-col gap-2 py-0.5 select-text" onClick={(e) => e.stopPropagation()}>
          <div className="flex-1 min-h-0 bg-panel-deep border border-line rounded-sm p-2 focus-within:border-accent hover:border-line-hover transition-colors flex flex-col">
            <textarea
              value={shot.action || ''}
              onChange={(e) => {
                const nextAction = e.target.value
                const matches = Array.from(nextAction.matchAll(/\{\{([^}]+)\}\}/g)).map(m => m[1].trim())
                const matchedAssets = assets.filter(a => matches.includes(a.name))
                
                const charAssets = matchedAssets.filter(a => a.category === 'character')
                const charIds = charAssets.map(c => c.id)
                const charNames = charAssets.map(c => c.name)

                const sceneAsset = matchedAssets.find(a => a.category === 'scene')

                onUpdate({
                  action: nextAction,
                  characterAssetIds: charIds,
                  characters: charNames,
                  ...(sceneAsset ? {
                    sceneAssetId: sceneAsset.id,
                    scene: sceneAsset.name
                  } : {})
                })
              }}
              className="w-full flex-1 bg-transparent border-0 outline-none text-xs text-ink placeholder:text-ink-mute leading-relaxed resize-none p-0 focus:ring-0 focus:outline-none"
              placeholder="🎬 画面动作 / 事件发生 (Action)..."
            />
          </div>

          <div className="flex-1 min-h-0 bg-panel-deep border border-line rounded-sm p-2 focus-within:border-accent hover:border-line-hover transition-colors flex flex-col">
            <textarea
              value={shot.dialogue || ''}
              onChange={(e) => onUpdate({ dialogue: e.target.value })}
              className="w-full flex-1 bg-transparent border-0 outline-none text-xs text-ink placeholder:text-ink-mute leading-relaxed resize-none p-0 focus:ring-0 focus:outline-none"
              placeholder="💬 角色台词 / 旁白配音 (Dialogue)..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function StoryboardWorkspace() {
  const { assets, shots, chapters, selectedShotId, selectShot, updateShot, addShot, removeShot, selectedChapterId, providers } = useProject()
  const { enqueue, tasks } = useGenerate()

  const list = selectedChapterId
    ? shots.filter((s) => s.chapterId === selectedChapterId)
    : shots

  const currentChapter = chapters.find((c) => c.id === selectedChapterId)
  const total = list.length

  const imageProviders = providers.filter((p) => p.kind === 'image' && p.enabled)
  const videoProviders = providers.filter((p) => p.kind === 'video' && p.enabled)
  const hasImageProvider = imageProviders.length > 0
  const hasVideoProvider = videoProviders.length > 0

  const activeShotId = selectedShotId || list[0]?.id

  // 监听选中镜头变化，自动将主编辑列表平滑滚动到对应的具体卡片
  useEffect(() => {
    if (activeShotId) {
      const el = document.getElementById(`shot-detail-${activeShotId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [activeShotId])

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-panel-deep">
      <WorkspaceHeader 
        title="分镜脚本序列" 
        subtitle={currentChapter ? `${chapterLabel(currentChapter)} ${currentChapter.title || ''} · 共 ${total} 个镜头` : `全部分镜 · 共 ${total} 个镜头`} 
      />
      
      {/* 故事板核心编辑大区 (合二为一，大画幅自适应) */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
        {list.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-ink-dim">
            <div className="text-sm mb-2">当前章节尚无分镜镜头</div>
            <button
              onClick={() => addShot(selectedChapterId || undefined)}
              className="h-8 px-4 bg-accent text-white text-xs hover:bg-accent/80 transition-colors rounded-sm"
            >
              + 新建第一个分镜
            </button>
          </div>
        ) : (
          <div className="space-y-5 w-full flex-1 flex flex-col">
            <div className="space-y-5 flex-1 pr-1">
              {list.map((s) => {
                const shotTask = tasks.find((t) => t.shotId === s.id && t.type === 'image')
                const videoTask = tasks.find((t) => t.shotId === s.id && t.type === 'video')
                const isGenerating = shotTask?.status === 'running' || shotTask?.status === 'queued'
                const isVideoGenerating = videoTask?.status === 'running' || videoTask?.status === 'queued'

                return (
                  <div key={s.id} id={`shot-detail-${s.id}`} className="scroll-mt-4">
                    <StoryboardRowCard
                      shot={s}
                      active={activeShotId === s.id}
                      onSelect={() => selectShot(s.id)}
                      onUpdate={(patch) => updateShot(s.id, patch)}
                      onRemove={() => removeShot(s.id)}
                      hasImageProvider={hasImageProvider}
                      hasVideoProvider={hasVideoProvider}
                      isGenerating={isGenerating}
                      isVideoGenerating={isVideoGenerating}
                      shotTask={shotTask}
                      videoTask={videoTask}
                      enqueue={enqueue}
                      assets={assets}
                      providers={providers}
                    />
                  </div>
                )
              })}
            </div>
            
            <div className="pt-3 pb-1 flex justify-center shrink-0">
              <button
                onClick={() => addShot(selectedChapterId || undefined)}
                className="h-9 px-6 bg-panel border border-line text-ink hover:bg-panel-hover text-xs font-semibold flex items-center gap-1.5 transition-colors rounded-sm shadow-sm"
              >
                + 新增分镜镜头
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ===== 生成工作区 =====
function GenerateWorkspace() {
  const { shots, chapters } = useProject()
  const { tasks } = useGenerate()
  const [previewIndex, setPreviewIndex] = useState(0)

  const totalDuration = shots.reduce((sum, s) => sum + (s.duration || 0), 0)
  const minutes = Math.floor(totalDuration / 60)
  const seconds = Math.floor(totalDuration % 60).toString().padStart(2, '0')

  const safeIndex = Math.max(0, Math.min(previewIndex, shots.length - 1))
  const previewShot = shots[safeIndex]
  const previewChapter = previewShot ? chapters.find((c) => c.id === previewShot.chapterId) : null

  const stats = {
    image: shots.filter((s) => s.imagePath).length,
    video: shots.filter((s) => s.videoPath).length,
    audio: shots.filter((s) => s.audioPath).length
  }

  const taskStats = {
    queued: tasks.filter((t) => t.status === 'queued').length,
    running: tasks.filter((t) => t.status === 'running').length,
    done: tasks.filter((t) => t.status === 'done').length,
    failed: tasks.filter((t) => t.status === 'error').length
  }

  return (
    <>
      <WorkspaceHeader
        title="视频生成"
        subtitle={`${shots.length} 镜头 · 总时长 ${minutes}:${seconds}`}
      />
      <div className="flex-1 flex flex-col min-h-0">
        {/* 预览区 */}
        <div className="flex-1 flex items-center justify-center bg-black/40 min-h-0">
          {shots.length === 0 ? (
            <div className="text-center text-ink-dim">
              <div className="text-sm mb-2">尚未生成分镜</div>
              <div className="text-2xs">请先在"分镜"阶段创建镜头</div>
            </div>
          ) : (
            <div className="text-center space-y-3 p-4">
              <div className="w-[640px] h-[360px] bg-panel-deep border border-line flex items-center justify-center mx-auto relative">
                {previewShot?.imagePath ? (
                  <img src={previewShot.imagePath} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-xs text-ink-dim">尚未生成画面</span>
                )}
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-2xs text-ink font-mono">
                  {String(safeIndex + 1).padStart(2, '0')} / {String(shots.length).padStart(2, '0')}
                </div>
              </div>

              {previewShot && (
                <div className="text-2xs text-ink-mute max-w-2xl truncate">
                  {previewChapter?.title ?? '未关联章节'} · {previewShot.scene || '(无场景)'}
                  · {previewShot.duration?.toFixed(1) ?? '0'}s
                </div>
              )}

              <div className="flex items-center justify-center gap-3 text-xs">
                <button
                  onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                  disabled={safeIndex === 0}
                  className="h-7 px-4 bg-panel border border-line hover:bg-panel-hover disabled:opacity-50"
                >
                  上一镜
                </button>
                <button className="h-7 px-6 bg-accent text-white hover:bg-accent/80">
                  生成视频
                </button>
                <button
                  onClick={() => setPreviewIndex((i) => Math.min(shots.length - 1, i + 1))}
                  disabled={safeIndex >= shots.length - 1}
                  className="h-7 px-4 bg-panel border border-line hover:bg-panel-hover disabled:opacity-50"
                >
                  下一镜
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 底部统计条 */}
        <div className="h-12 shrink-0 flex items-center px-4 gap-6 bg-panel border-t border-line text-2xs">
          <StatPill label="图像" value={`${stats.image} / ${shots.length}`} />
          <StatPill label="视频" value={`${stats.video} / ${shots.length}`} />
          <StatPill label="配音" value={`${stats.audio} / ${shots.length}`} />
          <div className="flex-1" />
          <StatPill label="队列" value={`${taskStats.running} 进行 · ${taskStats.queued} 等待`} />
          <StatPill label="完成" value={`${taskStats.done}`} accent={taskStats.done > 0 ? 'success' : undefined} />
          {taskStats.failed > 0 && (
            <StatPill label="失败" value={`${taskStats.failed}`} accent="danger" />
          )}
        </div>
      </div>
    </>
  )
}

function StatPill({
  label, value, accent
}: {
  label: string
  value: string
  accent?: 'success' | 'danger'
}) {
  const valueClass =
    accent === 'success' ? 'text-accent' :
    accent === 'danger' ? 'text-accent-danger' :
    'text-ink'
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-ink-dim">{label}</span>
      <span className={`font-mono ${valueClass}`}>{value}</span>
    </div>
  )
}

// ===== 通用组件 =====
function WorkspaceHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="h-8 shrink-0 flex items-center gap-3 px-4 bg-panel-raised border-b border-line">
      <span className="text-xs text-ink font-medium">{title}</span>
      {subtitle && <span className="text-2xs text-ink-dim">{subtitle}</span>}
    </div>
  )
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs text-ink-dim mb-1.5 tracking-wide">{label}</div>
      {children}
    </div>
  )
}
