import { useState, useMemo } from 'react'
import { useProject } from '../store/project'
import { generateMedia } from '../services/media'
import {
  GENDER_LABELS
} from '../types/project'
import type {
  AssetItem,
  CharacterProfile,
  CharacterVoice,
  Gender,
  ModelProvider
} from '../types/project'

export function CharacterEditor({
  asset,
  onBack
}: {
  asset: AssetItem
  onBack?: () => void
}) {
  const { updateAsset, removeAsset, providers } = useProject()
  const profile: CharacterProfile = asset.character ?? {}

  const imageProvider = useMemo(() => providers.find((p) => p.kind === 'image' && p.enabled), [providers])
  const [generatingSheet, setGeneratingSheet] = useState(false)
  const [generatingViews, setGeneratingViews] = useState<Record<string, boolean>>({})

  const update = (patch: Partial<AssetItem>) => updateAsset(asset.id, patch)
  const updateProfile = (patch: Partial<CharacterProfile>) =>
    update({ character: { ...profile, ...patch } })

  const handleImportSheet = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const localPath = (file as any).path || ""
    if (localPath) {
      const formattedPath = `lumen-media:///${localPath.replace(/\\/g, '/')}`
      update({ views: { ...asset.views, sheetPath: formattedPath } })
    } else {
      const fallbackUrl = URL.createObjectURL(file)
      update({ views: { ...asset.views, sheetPath: fallbackUrl } })
    }
  }

  const handleGenerateSheet = async () => {
    if (!imageProvider || generatingSheet) return
    setGeneratingSheet(true)
    try {
      const genderStr = profile.gender === 'male' ? 'male' : profile.gender === 'female' ? 'female' : 'androgynous'
      const appearanceStr = profile.appearance || 'detailed facial features, clean haircut'
      
      const sheetPrompt = `Character turnaround sheet, head and face only, front view, side profile view, back view, consolidated into a single concept art image. Focusing purely on facial features, eyes, nose, lips, ears and hairstyle. Completely independent of clothing, outfit, body shape, or garments. Flat plain neutral studio background, white background. ${genderStr} character, ${appearanceStr}, consistent model face, master artwork, highly detailed, sharp focus.`
      
      const result = await generateMedia({
        provider: imageProvider,
        prompt: sheetPrompt,
        kind: 'image',
        ratio: '2:1'
      })
      
      const formattedPath = `lumen-media:///${result.path.replace(/\\/g, '/')}`
      update({ views: { ...asset.views, sheetPath: formattedPath } })
    } catch (err) {
      console.error('[CharacterEditor] failed to generate sheet:', err)
      alert(err instanceof Error ? err.message : '生成失败')
    } finally {
      setGeneratingSheet(false)
    }
  }

  const handleImportView = (viewKey: 'front' | 'side' | 'back', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const localPath = (file as any).path || ""
    if (localPath) {
      const formattedPath = `lumen-media:///${localPath.replace(/\\/g, '/')}`
      update({ views: { ...asset.views, [viewKey]: formattedPath } })
    } else {
      const fallbackUrl = URL.createObjectURL(file)
      update({ views: { ...asset.views, [viewKey]: fallbackUrl } })
    }
  }

  const handleGenerateView = async (viewKey: 'front' | 'side' | 'back') => {
    if (!imageProvider || generatingViews[viewKey]) return
    setGeneratingViews(prev => ({ ...prev, [viewKey]: true }))
    try {
      const genderStr = profile.gender === 'male' ? 'male' : profile.gender === 'female' ? 'female' : 'androgynous'
      const appearanceStr = profile.appearance || 'detailed facial features, clean haircut'
      const viewName = viewKey === 'front' ? 'straight front view portrait' : viewKey === 'side' ? '90-degree side profile portrait' : 'back view of head portrait'
      
      const viewPrompt = `Character concept portrait, ${viewName}, focusing on head and face. Completely independent of clothing or body shape, close-up shot, flat plain background. ${genderStr} character, ${appearanceStr}, master artwork, highly detailed.`
      
      const result = await generateMedia({
        provider: imageProvider,
        prompt: viewPrompt,
        kind: 'image',
        ratio: '1:1'
      })
      
      const formattedPath = `lumen-media:///${result.path.replace(/\\/g, '/')}`
      update({ views: { ...asset.views, [viewKey]: formattedPath } })
    } catch (err) {
      console.error('[CharacterEditor] failed to generate view:', err)
      alert(err instanceof Error ? err.message : '生成失败')
    } finally {
      setGeneratingViews(prev => ({ ...prev, [viewKey]: false }))
    }
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col min-h-0">
      {/* 头部 */}
      <div className="h-9 shrink-0 flex items-center gap-3 px-3 border-b border-line bg-panel">
        {onBack && (
          <button
            onClick={onBack}
            className="text-2xs text-ink-mute hover:text-ink"
          >
            ← 返回列表
          </button>
        )}
        <input
          value={asset.name}
          onChange={(e) => update({ name: e.target.value })}
          className="text-sm text-ink bg-transparent border-b border-transparent hover:border-line focus:border-accent focus:outline-none flex-1 py-0.5"
          placeholder="人物姓名"
        />
        <span className="text-2xs text-ink-dim">
          引用语法: {`{{${asset.name || '姓名'}}}`}
        </span>
        <button
          onClick={() => {
            removeAsset(asset.id)
            onBack?.()
          }}
          className="text-2xs text-ink-dim hover:text-accent-danger"
        >
          删除
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="p-5 max-w-4xl space-y-5">
          {/* 基本资料 */}
          <Section title="基本资料">
            <Grid cols={3}>
              <FF label="别名 / 称呼">
                <Input
                  value={profile.alias ?? ''}
                  onChange={(v) => updateProfile({ alias: v })}
                  placeholder="如: 林夕、夕公子"
                />
              </FF>
              <FF label="年龄">
                <Input
                  value={profile.age ?? ''}
                  onChange={(v) => updateProfile({ age: v })}
                  placeholder="二十出头 / 约 30"
                />
              </FF>
              <FF label="性别">
                <Select
                  value={profile.gender ?? 'unknown'}
                  onChange={(v) => updateProfile({ gender: v as Gender })}
                  options={Object.entries(GENDER_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                />
              </FF>
            </Grid>
            <FF label="身份 / 职业">
              <Input
                value={profile.identity ?? ''}
                onChange={(v) => updateProfile({ identity: v })}
                placeholder="如: 御史中丞、山门弟子、星际雇佣兵"
              />
            </FF>
            <Grid cols={2}>
              <FF label="分组">
                <Input
                  value={asset.group}
                  onChange={(v) => update({ group: v })}
                  placeholder="主角 / 配角 / 反派"
                />
              </FF>
              <FF label="标签">
                <Input
                  value={asset.tags.join(', ')}
                  onChange={(v) =>
                    update({ tags: v.split(',').map((s) => s.trim()).filter(Boolean) })
                  }
                  placeholder="逗号分隔: 修真, 御剑, 内门"
                />
              </FF>
            </Grid>
          </Section>

          {/* 五官/头部三视图合集 */}
          <Section title="五官/头部三视图合集 (无关身材服饰)">
            <div className="space-y-3">
              <p className="text-2xs text-ink-dim leading-relaxed">
                这是**无关身材和服饰**的纯脸部/头部多视角合集图（包含正面、侧面、背面/斜侧面等）。
                该图专门用于维持角色在不同分镜画面中的**五官与面部特征一致性**，不随服饰体型变化而改变。
              </p>
              
              <div className="aspect-[2/1] w-full bg-panel-deep border border-line flex flex-col items-center justify-center text-2xs text-ink-dim gap-2 overflow-hidden relative group rounded-sm">
                {asset.views?.sheetPath ? (
                  <>
                    <img src={asset.views.sheetPath.replace(/^file:\/\/\//, 'lumen-media:///')} className="w-full h-full object-contain" alt="五官三视图合集图" />
                    <div className="absolute inset-x-0 bottom-0 bg-black/80 py-1.5 px-3 text-center text-white translate-y-full group-hover:translate-y-0 transition-transform flex items-center justify-center gap-3">
                      <label className="text-2xs text-accent hover:underline cursor-pointer">
                        📁 重新导入本地图...
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImportSheet}
                        />
                      </label>
                      <span className="text-line-soft">|</span>
                      <button
                        onClick={handleGenerateSheet}
                        disabled={generatingSheet || !imageProvider}
                        className="text-2xs text-accent hover:underline disabled:opacity-50"
                      >
                        {generatingSheet ? '生成中...' : '✨ 重新生成合集图'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-4 text-center space-y-2.5">
                    <div className="text-2xs text-ink-dim">尚未生成或导入无身材服饰的五官三视图合集图</div>
                    <div className="flex justify-center gap-2">
                      <label className="h-7 px-3 bg-panel border border-line text-2xs text-ink hover:bg-panel-hover hover:text-accent cursor-pointer flex items-center rounded-sm transition-colors">
                        📁 导入本地合集图...
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImportSheet}
                        />
                      </label>
                      <button
                        onClick={handleGenerateSheet}
                        disabled={generatingSheet || !imageProvider}
                        className="h-7 px-3 bg-accent text-white text-2xs hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-sm transition-colors flex items-center gap-1 font-medium"
                      >
                        {generatingSheet ? 'AI 正在绘制...' : '✨ AI 生成合集三视图'}
                      </button>
                    </div>
                  </div>
                )}
                
                {generatingSheet && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white z-10">
                    <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-2xs font-semibold animate-pulse">AI 正在绘制五官发型一致性合集图...</p>
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* 各视角多角度肖像 */}
          <Section title="标准角色各视角肖像 (Portrait Turnarounds)">
            <Grid cols={3}>
              {(['front', 'side', 'back'] as const).map((v) => (
                <div key={v} className="space-y-1.5">
                  <div className="text-2xs text-ink-dim text-center font-medium">
                    {v === 'front' ? '正面 (Front View)' : v === 'side' ? '侧面 (Side View)' : '背面 (Back View)'}
                  </div>
                  <div className="aspect-square bg-panel-deep border border-line flex flex-col items-center justify-center text-2xs text-ink-dim gap-2 overflow-hidden relative group rounded-sm">
                    {asset.views?.[v] ? (
                      <>
                        <img src={asset.views[v].replace(/^file:\/\/\//, 'lumen-media:///')} className="w-full h-full object-contain" alt={v} />
                        <div className="absolute inset-x-0 bottom-0 bg-black/80 py-1 text-center text-white translate-y-full group-hover:translate-y-0 transition-transform flex flex-col gap-1 items-center justify-center">
                          <label className="text-[10px] text-accent hover:underline cursor-pointer">
                            重新导入...
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImportView(v, e)}
                            />
                          </label>
                          <button
                            onClick={() => handleGenerateView(v)}
                            disabled={generatingViews[v] || !imageProvider}
                            className="text-[10px] text-accent hover:underline disabled:opacity-50"
                          >
                            {generatingViews[v] ? '生成中...' : '重新生成'}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="p-2 text-center flex flex-col items-center justify-center gap-2">
                        <span>未导入 / 生成</span>
                        <div className="flex flex-col gap-1 w-full">
                          <label className="h-6 px-1.5 bg-panel border border-line text-[10px] hover:bg-panel-hover flex items-center justify-center cursor-pointer rounded-sm transition-colors">
                            导入图片
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImportView(v, e)}
                            />
                          </label>
                          <button
                            onClick={() => handleGenerateView(v)}
                            disabled={generatingViews[v] || !imageProvider}
                            className="h-6 px-1.5 bg-accent/10 border border-accent/20 text-accent text-[10px] hover:bg-accent/20 disabled:opacity-50 rounded-sm transition-colors font-medium"
                          >
                            {generatingViews[v] ? 'AI 生成...' : 'AI 自动生成'}
                          </button>
                        </div>
                      </div>
                    )}

                    {generatingViews[v] && (
                      <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white z-10">
                        <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin mb-1" />
                        <span className="text-[9px] animate-pulse">绘制中...</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </Grid>
          </Section>

          {/* 外貌 */}
          <Section title="外貌">
            <FF label="体型 / 五官 / 发型">
              <TextArea
                value={profile.appearance ?? ''}
                onChange={(v) => updateProfile({ appearance: v })}
                rows={3}
                placeholder="如: 身形清瘦, 眉目疏朗, 黑发束起, 左眉骨有一道浅疤"
              />
            </FF>
            <FF label="服饰 / 配饰 / 标志物">
              <TextArea
                value={profile.outfit ?? ''}
                onChange={(v) => updateProfile({ outfit: v })}
                rows={3}
                placeholder="如: 玄色长衫, 腰悬一柄无锋古剑, 颈间挂一枚青玉吊坠"
              />
            </FF>
          </Section>

          {/* 性格与背景 */}
          <Section title="性格与背景">
            <FF label="性格 / 习性 / 口头禅">
              <TextArea
                value={profile.personality ?? ''}
                onChange={(v) => updateProfile({ personality: v })}
                rows={3}
                placeholder="性格、行为模式、口头禅、习惯小动作..."
              />
            </FF>
            <FF label="背景 / 经历 / 动机">
              <TextArea
                value={profile.background ?? ''}
                onChange={(v) => updateProfile({ background: v })}
                rows={4}
                placeholder="出身、关键经历、当前驱动力..."
              />
            </FF>
            <FF label="人物关系">
              <TextArea
                value={profile.relations ?? ''}
                onChange={(v) => updateProfile({ relations: v })}
                rows={3}
                placeholder={'与其他角色的关系网, 可使用 {{xxx}} 引用其它角色\n如: 师从 {{玄玑老人}}; 与 {{苏婉}} 青梅竹马'}
              />
            </FF>
          </Section>

          {/* 音色 */}
          <Section title="音色">
            <VoiceEditor
              voice={profile.voice}
              providers={providers}
              onChange={(voice) => updateProfile({ voice })}
            />
          </Section>
        </div>
      </div>
    </div>
  )
}

// ===== 音色编辑器 =====
function VoiceEditor({
  voice,
  providers,
  onChange
}: {
  voice: CharacterVoice | undefined
  providers: ModelProvider[]
  onChange: (v: CharacterVoice) => void
}) {
  const v: CharacterVoice = voice ?? { mode: 'preset', speed: 1, pitch: 0 }
  const update = (patch: Partial<CharacterVoice>) => onChange({ ...v, ...patch })

  const ttsProviders = useMemo(() => providers.filter((p) => p.kind === 'tts'), [providers])
  const presetProviders = ttsProviders
  const cloneProviders = useMemo(
    () => ttsProviders.filter((p) => p.supportsClone),
    [ttsProviders]
  )

  const presetProvider = ttsProviders.find((p) => p.id === v.providerId)
  const cloneProvider = cloneProviders.find((p) => p.id === v.cloneProviderId)

  return (
    <div className="space-y-3">
      {/* 模式切换 */}
      <div className="inline-flex h-7 border border-line">
        {(['preset', 'clone'] as const).map((m) => (
          <button
            key={m}
            onClick={() => update({ mode: m })}
            className={[
              'px-3 text-2xs transition-colors',
              v.mode === m
                ? 'bg-accent text-white'
                : 'bg-panel-deep text-ink-mute hover:text-ink'
            ].join(' ')}
          >
            {m === 'preset' ? '预制音色' : '声音克隆'}
          </button>
        ))}
      </div>

      {/* 预制音色 */}
      {v.mode === 'preset' && (
        <Grid cols={2}>
          <FF label="TTS Provider">
            {presetProviders.length === 0 ? (
              <NoProviderHint kind="tts" />
            ) : (
              <Select
                value={v.providerId ?? ''}
                onChange={(id) => update({ providerId: id, voiceId: undefined })}
                options={[
                  { value: '', label: '请选择...' },
                  ...presetProviders.map((p) => ({ value: p.id, label: p.name }))
                ]}
              />
            )}
          </FF>
          <FF label="预制音色">
            {!presetProvider ? (
              <Hint>先选择 Provider</Hint>
            ) : (presetProvider.voices ?? []).length === 0 ? (
              <Hint>该 Provider 未配置预制音色 (在「设置 → {presetProvider.name}」中添加)</Hint>
            ) : (
              <Select
                value={v.voiceId ?? ''}
                onChange={(id) => update({ voiceId: id })}
                options={[
                  { value: '', label: '请选择...' },
                  ...(presetProvider.voices ?? []).map((id) => ({ value: id, label: id }))
                ]}
              />
            )}
          </FF>
        </Grid>
      )}

      {/* 克隆 */}
      {v.mode === 'clone' && (
        <div className="space-y-3">
          <FF label="克隆 Provider">
            {cloneProviders.length === 0 ? (
              <Hint>
                尚无支持克隆的 TTS Provider. 在「设置 → 语音合成」中添加 Fish Speech / GPT-SoVITS / CosyVoice / ElevenLabs 等并勾选「支持声音克隆」.
              </Hint>
            ) : (
              <Select
                value={v.cloneProviderId ?? ''}
                onChange={(id) => update({ cloneProviderId: id })}
                options={[
                  { value: '', label: '请选择...' },
                  ...cloneProviders.map((p) => ({ value: p.id, label: p.name }))
                ]}
              />
            )}
          </FF>

          <FF label="参考音频 (5~30 秒, 干净人声)">
            <div className="flex gap-2 items-center">
              <input
                value={v.sampleUrl ?? ''}
                onChange={(e) => update({ sampleUrl: e.target.value })}
                placeholder="文件路径或 URL"
                className="flex-1 h-7 px-2 bg-panel-deep border border-line text-xs text-ink font-mono focus:border-accent focus:outline-none"
              />
              <label className="h-7 px-3 bg-panel border border-line text-2xs text-ink hover:bg-panel-hover cursor-pointer flex items-center">
                选择文件
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) update({ sampleUrl: f.name })
                  }}
                />
              </label>
              {v.sampleUrl && (
                <button
                  className="h-7 px-3 bg-panel border border-line text-2xs text-ink hover:bg-panel-hover"
                  title="试听 (需接入 TTS API)"
                >
                  ▶
                </button>
              )}
            </div>
          </FF>

          <FF label="参考音频文本 (零样本克隆需要)">
            <TextArea
              value={v.sampleText ?? ''}
              onChange={(text) => update({ sampleText: text })}
              rows={2}
              placeholder="参考音频对应的逐字文本"
            />
          </FF>

          {cloneProvider && !cloneProvider.apiKey && cloneProvider.baseUrl?.startsWith('http') && !cloneProvider.baseUrl.includes('localhost') && (
            <Hint>该 Provider 尚未配置 API Key</Hint>
          )}
        </div>
      )}

      {/* 通用调整 */}
      <Grid cols={2}>
        <FF label={`语速 ${v.speed?.toFixed(2) ?? '1.00'}x`}>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.05}
            value={v.speed ?? 1}
            onChange={(e) => update({ speed: parseFloat(e.target.value) })}
            className="w-full accent-accent"
          />
        </FF>
        <FF label={`音高 ${v.pitch ?? 0 >= 0 ? '+' : ''}${v.pitch ?? 0} 半音`}>
          <input
            type="range"
            min={-12}
            max={12}
            step={1}
            value={v.pitch ?? 0}
            onChange={(e) => update({ pitch: parseInt(e.target.value, 10) })}
            className="w-full accent-accent"
          />
        </FF>
      </Grid>

      <FF label="情感倾向 (可选)">
        <Input
          value={v.emotion ?? ''}
          onChange={(emotion) => update({ emotion })}
          placeholder="如: 中性 / 冷静克制 / 阴郁低沉 / 高亢激昂"
        />
      </FF>

      <FF label="备注">
        <Input
          value={v.note ?? ''}
          onChange={(note) => update({ note })}
          placeholder="对该角色音色的额外说明"
        />
      </FF>

      <div className="flex gap-2 pt-2 border-t border-line">
        <button
          className="h-8 px-4 bg-panel border border-line text-xs text-ink hover:bg-panel-hover"
          title="试听 (需先配置 TTS Provider 并接入 API)"
        >
          ▶ 试听该角色音色
        </button>
        <input
          placeholder="输入试听文本..."
          className="flex-1 h-8 px-2 bg-panel-deep border border-line text-xs text-ink focus:border-accent focus:outline-none"
          defaultValue="在繁星之间, 我听见了你的名字."
        />
      </div>
    </div>
  )
}

// ===== 通用小组件 =====
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-line bg-panel">
      <div className="h-7 flex items-center px-3 bg-panel-raised border-b border-line text-2xs text-ink-mute tracking-wide">
        {title}
      </div>
      <div className="p-3 space-y-3">{children}</div>
    </div>
  )
}

function Grid({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  )
}

function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs text-ink-dim mb-1 tracking-wide">{label}</div>
      {children}
    </div>
  )
}

function Input({
  value, onChange, placeholder
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-7 px-2 bg-panel-deep border border-line text-xs text-ink focus:border-accent focus:outline-none"
    />
  )
}

function TextArea({
  value, onChange, rows, placeholder
}: {
  value: string
  onChange: (v: string) => void
  rows: number
  placeholder?: string
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full p-2 bg-panel-deep border border-line text-xs text-ink resize-none focus:border-accent focus:outline-none leading-relaxed"
    />
  )
}

function Select({
  value, onChange, options
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-7 px-2 bg-panel-deep border border-line text-xs text-ink focus:border-accent focus:outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return <div className="text-2xs text-ink-dim py-1">{children}</div>
}

function NoProviderHint({ kind }: { kind: string }) {
  return (
    <div className="text-2xs text-ink-dim py-1">
      尚未配置任何 {kind.toUpperCase()} Provider, 请先到「设置 → 语音合成」添加.
    </div>
  )
}
