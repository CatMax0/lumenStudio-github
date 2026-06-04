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

type CharacterViews = NonNullable<AssetItem['views']>

const formatMediaPath = (path: string) => `lumen-media:///${path.replace(/\\/g, '/')}`

const genderPrompt = (gender?: Gender) => {
  if (gender === 'male') return 'male'
  if (gender === 'female') return 'female'
  if (gender === 'neutral') return 'androgynous / gender-neutral'
  return 'unspecified gender'
}

const valueOr = (value: string | undefined, fallback: string) => value?.trim() || fallback

function buildCharacterSpec(name: string, profile: CharacterProfile) {
  return [
    `Character name / identity anchor: ${name || profile.alias || 'unnamed character'}`,
    profile.alias ? `alias: ${profile.alias}` : '',
    profile.age ? `age: ${profile.age}` : '',
    `gender: ${genderPrompt(profile.gender)}`,
    profile.identity ? `occupation / social identity: ${profile.identity}` : '',
    `FACE AND BODY DESCRIPTION TO FOLLOW STRICTLY: ${valueOr(profile.appearance, 'highly specific facial structure, facial proportions, hairstyle, hair color, skin tone, body shape and silhouette')}`,
    `COSTUME AND ACCESSORIES TO FOLLOW STRICTLY: ${valueOr(profile.outfit, 'highly specific outfit layers, fabric material, colors, accessories, symbolic objects and footwear')}`
  ].filter(Boolean).join('\n')
}

const exactDesignRules = [
  'STRICT character design reference sheet, no random redesign, no alternate costume, no missing accessories.',
  'Preserve the same face, hairstyle, age, body silhouette, clothing layers, fabric materials, colors, ornaments and signature props in every panel.',
  'Use clean neutral studio lighting, plain white background, orthographic concept art, sharp edges, full detail visibility.'
].join(' ')

function buildReferenceSheetPrompt(name: string, profile: CharacterProfile) {
  return `Create ONE single comprehensive CHARACTER REFERENCE SHEET (model sheet) image that merges everything below into one neatly arranged composition on a single plain white background:
- TOP ROW — HEAD TURNAROUND: three head-and-shoulders portraits of the SAME character, labeled FRONT, SIDE PROFILE (exact 90°), BACK; focus on face structure, eyes, nose, lips, ears, jawline, skin, hairline and hairstyle.
- MIDDLE ROW — FULL-BODY TURNAROUND: three head-to-toe standing views of the SAME character, labeled FRONT, SIDE (exact 90°), BACK; neutral relaxed A-pose, entire silhouette visible from head to toe.
- BOTTOM — DETAIL CALLOUTS: close-up inset panels of the ACCESSORIES (jewelry, ornaments, signature props, weapons, bags, footwear) and the COSTUME / CLOTHING DETAILS (fabric texture, seams, trims, patterns, layering, fasteners).
Every panel MUST depict the exact same person with identical face, hairstyle, age, body proportions, outfit, colors, materials and props — no redesign, no alternate costume, no missing accessory between panels. ${exactDesignRules}
${buildCharacterSpec(name, profile)}
Orthographic concept art, clean neutral studio lighting, sharp crisp lines, ultra-detailed production model sheet, plain white background, no extra text other than the short view labels.`
}

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

  const update = (patch: Partial<AssetItem>) => updateAsset(asset.id, patch)
  const updateProfile = (patch: Partial<CharacterProfile>) =>
    update({ character: { ...profile, ...patch } })
  const updateViews = (patch: Partial<CharacterViews>) => update({ views: patch })

  const handleImportSheet = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const localPath = (file as any).path || ""
    updateViews({ sheetPath: localPath ? formatMediaPath(localPath) : URL.createObjectURL(file) })
  }

  const handleGenerateSheet = async () => {
    if (!imageProvider || generatingSheet) return
    setGeneratingSheet(true)
    try {
      const result = await generateMedia({
        provider: imageProvider,
        prompt: buildReferenceSheetPrompt(asset.name, profile),
        kind: 'image',
        ratio: '4:3'
      })
      updateViews({ sheetPath: formatMediaPath(result.path) })
    } catch (err) {
      console.error('[CharacterEditor] failed to generate reference sheet:', err)
      alert(err instanceof Error ? err.message : '生成失败')
    } finally {
      setGeneratingSheet(false)
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

          <Section title="角色参考总图 (一张图：头部三视图 + 全身三视图 + 配饰 + 服装细节)">
            <div className="space-y-3">
              <p className="text-2xs text-ink-dim leading-relaxed">
                一键生成单张完整角色参考图，<b>合并在同一张图</b>中：「头部三视图（正/侧/背）」「全身三视图（正/侧/背）」以及「配饰」和「服装细节」特写。
                提示词会严格锁定下方填写的五官、体型、发型、服饰材质、配饰和标志物，保证各视角同一套造型一致。
              </p>

              <div className="aspect-[4/3] w-full bg-panel-deep border border-line flex flex-col items-center justify-center text-2xs text-ink-dim gap-2 overflow-hidden relative group rounded-sm">
                {asset.views?.sheetPath ? (
                  <>
                    <img src={asset.views.sheetPath.replace(/^file:\/\/\//, 'lumen-media:///')} className="w-full h-full object-contain" alt="角色参考总图" />
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
                        {generatingSheet ? '生成中...' : '✨ 重新生成参考总图'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-4 text-center space-y-2.5">
                    <div className="text-2xs text-ink-dim">尚未生成或导入角色参考总图</div>
                    {imageProvider ? (
                      <div className="flex justify-center gap-2">
                        <label className="h-7 px-3 bg-panel border border-line text-2xs text-ink hover:bg-panel-hover hover:text-accent cursor-pointer flex items-center rounded-sm transition-colors">
                          📁 导入本地图...
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
                          {generatingSheet ? 'AI 正在绘制...' : '✨ AI 生成参考总图'}
                        </button>
                      </div>
                    ) : (
                      <NoProviderHint kind="image" />
                    )}
                  </div>
                )}

                {generatingSheet && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white z-10">
                    <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-2xs font-semibold animate-pulse">AI 正在绘制角色参考总图...</p>
                  </div>
                )}
              </div>
            </div>
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
