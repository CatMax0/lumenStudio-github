import { useState, useMemo } from 'react'
import { Modal } from './Modal'
import { useUI } from '../store/ui'
import { useProject } from '../store/project'
import {
  ASSET_CATEGORY_LABELS,
  TEXT_SUBCATEGORY_LABELS,
  ASSET_GEN_TOOL_LABELS
} from '../types/project'
import type {
  AssetCategory,
  AssetItem,
  TextSubcategory,
  AssetGenTool
} from '../types/project'
import { CharacterEditor } from '../components/CharacterEditor'
import { ScenePanoramaEditor } from '../components/ScenePanoramaEditor'

const CATS: AssetCategory[] = ['character', 'scene', 'prop', 'text', 'sfx', 'bgm']

type Mode = 'browse' | 'generate'

export function AssetLibraryModal() {
  const { modal, closeModal } = useUI()
  const [mode, setMode] = useState<Mode>('browse')
  const [cat, setCat] = useState<AssetCategory>('character')

  return (
    <Modal open={modal === 'library'} onClose={closeModal} title="公共素材库">
      {/* 左侧: 类别导航 */}
      <aside className="w-44 shrink-0 bg-panel-deep border-r border-line flex flex-col">
        <SectionLabel>类别</SectionLabel>
        {CATS.map((c) => (
          <NavItem
            key={c}
            label={ASSET_CATEGORY_LABELS[c]}
            active={cat === c}
            onClick={() => setCat(c)}
          />
        ))}

        <div className="h-px bg-line my-2" />
        <SectionLabel>操作</SectionLabel>
        <NavItem
          label="浏览素材"
          active={mode === 'browse'}
          onClick={() => setMode('browse')}
        />
        <NavItem
          label="生成新素材"
          active={mode === 'generate'}
          onClick={() => setMode('generate')}
        />
      </aside>

      {/* 主区 */}
      <div className="flex-1 min-w-0 flex flex-col">
        {mode === 'browse' && <BrowseView category={cat} />}
        {mode === 'generate' && <GenerateView category={cat} />}
      </div>
    </Modal>
  )
}

// ===== 浏览视图 =====
function BrowseView({ category }: { category: AssetCategory }) {
  const { assets, addAsset, removeAsset } = useProject()
  const [search, setSearch] = useState('')
  const [textSub, setTextSub] = useState<TextSubcategory | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      if (a.category !== category) return false
      if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false
      if (category === 'text' && textSub !== 'all' && a.text?.subcategory !== textSub)
        return false
      return true
    })
  }, [assets, category, search, textSub])

  // 选中人物 -> 详情编辑模式
  const selected = assets.find((a) => a.id === selectedId && a.category === category)
  if (category === 'character' && selected) {
    return <CharacterEditor asset={selected} onBack={() => setSelectedId(null)} />
  }
  if (category === 'scene' && selected) {
    return <ScenePanoramaEditor asset={selected} onBack={() => setSelectedId(null)} />
  }

  return (
    <>
      {/* 工具栏 */}
      <div className="h-9 shrink-0 flex items-center gap-2 px-3 border-b border-line bg-panel">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`搜索${ASSET_CATEGORY_LABELS[category]}...`}
          className="w-64 h-7 px-2 bg-panel-deep border border-line text-xs text-ink focus:border-accent focus:outline-none"
        />
        {category === 'text' && (
          <select
            value={textSub}
            onChange={(e) => setTextSub(e.target.value as TextSubcategory | 'all')}
            className="h-7 px-2 bg-panel-deep border border-line text-xs text-ink focus:border-accent focus:outline-none"
          >
            <option value="all">全部子类</option>
            {Object.entries(TEXT_SUBCATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        )}
        <span className="text-2xs text-ink-dim ml-2">{filtered.length} 项</span>
        <div className="ml-auto flex gap-1.5">
          <button
            onClick={() => {
              addAsset({
                name: `新${ASSET_CATEGORY_LABELS[category]}`,
                category,
                group: '默认',
                tags: [],
                text: category === 'text'
                  ? { subcategory: 'custom', content: '' }
                  : undefined
              })
            }}
            className="h-7 px-3 bg-accent text-white text-xs hover:bg-accent/80"
          >
            + 新增
          </button>
          <button className="h-7 px-3 bg-panel-deep border border-line text-xs text-ink hover:bg-panel-hover">
            导入文件
          </button>
        </div>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-auto p-3">
        {filtered.length === 0 ? (
          <EmptyState category={category} />
        ) : category === 'text' ? (
          <TextAssetList items={filtered} onRemove={removeAsset} />
        ) : category === 'sfx' || category === 'bgm' ? (
          <AudioAssetList items={filtered} onRemove={removeAsset} />
        ) : (
          <ThreeViewGrid
            items={filtered}
            onRemove={removeAsset}
            onOpen={category === 'character' ? setSelectedId : (category === 'scene' ? setSelectedId : undefined)}
          />
        )}
      </div>
    </>
  )
}

// ===== 生成视图 =====
function GenerateView({ category }: { category: AssetCategory }) {
  const tool: AssetGenTool | null = useMemo(() => {
    switch (category) {
      case 'character': return 'three-view-character'
      case 'scene': return 'three-view-scene'
      case 'prop': return 'three-view-prop'
      case 'sfx': return 'sfx-search'
      case 'bgm': return 'sfx-search'
      case 'text': return 'text-extract'
      default: return null
    }
  }, [category])

  if (!tool) return null

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-3xl space-y-4">
        <div className="text-sm text-ink mb-4">
          {ASSET_GEN_TOOL_LABELS[tool]}
        </div>

        {(category === 'character' || category === 'scene' || category === 'prop') && (
          <ThreeViewGenForm category={category} />
        )}

        {category === 'text' && <TextExtractForm />}

        {(category === 'sfx' || category === 'bgm') && <AudioGenForm category={category} />}
      </div>
    </div>
  )
}

// ===== 三视图生成表单 =====
function ThreeViewGenForm({ category }: { category: 'character' | 'scene' | 'prop' }) {
  const { addAsset } = useProject()
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [style, setStyle] = useState('写实')

  return (
    <div className="space-y-3">
      <Field label="名称">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full h-7 px-2 bg-panel-deep border border-line text-xs text-ink focus:border-accent focus:outline-none"
          placeholder={`输入${ASSET_CATEGORY_LABELS[category]}名称`}
        />
      </Field>

      <Field label={`${ASSET_CATEGORY_LABELS[category]}描述`}>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full h-32 p-2 bg-panel-deep border border-line text-xs text-ink resize-none focus:border-accent focus:outline-none"
          placeholder={
            category === 'character'
              ? '外貌、服装、年龄、气质、特征...'
              : category === 'scene'
              ? '环境、时间、氛围、布局、光线...'
              : '材质、形状、用途、年代、风格...'
          }
        />
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="风格">
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="w-full h-7 px-2 bg-panel-deep border border-line text-xs text-ink focus:border-accent focus:outline-none"
          >
            <option>写实</option>
            <option>动漫</option>
            <option>水墨</option>
            <option>3D 渲染</option>
            <option>赛博朋克</option>
          </select>
        </Field>
        <Field label="生图模型">
          <select className="w-full h-7 px-2 bg-panel-deep border border-line text-xs text-ink focus:border-accent focus:outline-none">
            <option>FLUX.1-dev</option>
            <option>SDXL</option>
            <option>DALL·E 3</option>
          </select>
        </Field>
        <Field label="视图数">
          <select className="w-full h-7 px-2 bg-panel-deep border border-line text-xs text-ink focus:border-accent focus:outline-none">
            <option>3 (前/侧/后)</option>
            <option>4 (前/侧/后/3/4)</option>
            <option>仅正面</option>
          </select>
        </Field>
      </div>

      <Field label="预览">
        <div className="grid grid-cols-3 gap-2">
          {['正面', '侧面', '背面'].map((v) => (
            <div
              key={v}
              className="aspect-square bg-panel-deep border border-line flex items-center justify-center text-2xs text-ink-dim"
            >
              {v}
            </div>
          ))}
        </div>
      </Field>

      <div className="flex gap-2 pt-2 border-t border-line">
        <button className="h-8 px-4 bg-accent text-white text-xs hover:bg-accent/80">
          生成三视图
        </button>
        <button
          onClick={() => {
            if (!name) return
            addAsset({
              name,
              category,
              group: '默认',
              tags: [],
              generated: true
            })
            setName('')
            setDesc('')
          }}
          className="h-8 px-4 bg-panel-deep border border-line text-xs text-ink hover:bg-panel-hover"
        >
          保存到素材库
        </button>
      </div>
    </div>
  )
}

// ===== 文本提取表单 =====
function TextExtractForm() {
  const { addAsset } = useProject()
  const [name, setName] = useState('')
  const [sub, setSub] = useState<TextSubcategory>('history')
  const [content, setContent] = useState('')
  const [source, setSource] = useState('')

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="标题">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="如: 紫微斗数十二宫详解"
            className="w-full h-7 px-2 bg-panel-deep border border-line text-xs text-ink focus:border-accent focus:outline-none"
          />
        </Field>
        <Field label="子分类">
          <select
            value={sub}
            onChange={(e) => setSub(e.target.value as TextSubcategory)}
            className="w-full h-7 px-2 bg-panel-deep border border-line text-xs text-ink focus:border-accent focus:outline-none"
          >
            {Object.entries(TEXT_SUBCATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="来源 (可选)">
        <input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="书名、网址、出处..."
          className="w-full h-7 px-2 bg-panel-deep border border-line text-xs text-ink focus:border-accent focus:outline-none"
        />
      </Field>

      <Field label="正文内容">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-64 p-3 bg-panel-deep border border-line text-xs text-ink resize-none focus:border-accent focus:outline-none leading-relaxed"
          placeholder="粘贴或输入文本资料...&#10;&#10;支持 Markdown 格式，AI 写作时可作为知识背景引用"
        />
      </Field>

      <div className="flex gap-2 pt-2 border-t border-line">
        <button className="h-8 px-4 bg-panel-deep border border-line text-xs text-ink hover:bg-panel-hover">
          AI 总结提炼
        </button>
        <button className="h-8 px-4 bg-panel-deep border border-line text-xs text-ink hover:bg-panel-hover">
          从文件导入
        </button>
        <button
          onClick={() => {
            if (!name || !content) return
            addAsset({
              name,
              category: 'text',
              group: TEXT_SUBCATEGORY_LABELS[sub],
              tags: [],
              text: { subcategory: sub, content, source: source || undefined }
            })
            setName('')
            setContent('')
            setSource('')
          }}
          className="ml-auto h-8 px-4 bg-accent text-white text-xs hover:bg-accent/80"
        >
          保存到素材库
        </button>
      </div>
    </div>
  )
}

// ===== 音频生成 / 搜索 =====
function AudioGenForm({ category }: { category: 'sfx' | 'bgm' }) {
  return (
    <div className="space-y-3">
      <Field label="搜索关键词">
        <input
          placeholder={category === 'sfx' ? '如: 关门声、雷声、脚步' : '如: 古风、紧张、悲伤'}
          className="w-full h-7 px-2 bg-panel-deep border border-line text-xs text-ink focus:border-accent focus:outline-none"
        />
      </Field>
      <Field label="来源">
        <select className="w-full h-7 px-2 bg-panel-deep border border-line text-xs text-ink focus:border-accent focus:outline-none">
          <option>本地素材库</option>
          <option>Freesound</option>
          <option>Pixabay Music</option>
          <option>AI 生成 (Suno / Udio)</option>
        </select>
      </Field>
      <button className="h-8 px-4 bg-accent text-white text-xs hover:bg-accent/80">
        搜索 / 生成
      </button>
    </div>
  )
}

// ===== 列表 / 网格 =====
function ThreeViewGrid({
  items,
  onRemove,
  onOpen
}: {
  items: AssetItem[]
  onRemove: (id: string) => void
  onOpen?: (id: string) => void
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
      {items.map((a) => {
        const hasVoice = a.character?.voice?.providerId || a.character?.voice?.sampleUrl
        return (
          <div
            key={a.id}
            className={[
              'bg-panel-deep border border-line group',
              onOpen ? 'cursor-pointer hover:border-accent transition-colors' : ''
            ].join(' ')}
            onClick={() => onOpen?.(a.id)}
          >
            <div className="aspect-[4/3] grid grid-cols-3 border-b border-line">
              {(['front', 'side', 'back'] as const).map((v) => (
                <div
                  key={v}
                  className="border-r last:border-r-0 border-line-soft flex items-center justify-center text-2xs text-ink-dim"
                >
                  {a.views?.[v] ? (
                    <img src={a.views[v]} className="w-full h-full object-cover" />
                  ) : v === 'front' ? '前' : v === 'side' ? '侧' : '后'}
                </div>
              ))}
            </div>
            <div className="p-2 flex items-center gap-1.5">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-ink truncate flex items-center gap-1">
                  <span className="truncate">{a.name}</span>
                  {hasVoice && (
                    <span
                      title={`音色: ${a.character?.voice?.mode === 'clone' ? '克隆' : '预制'}`}
                      className="text-accent-dim"
                    >
                      ♪
                    </span>
                  )}
                </div>
                <div className="text-2xs text-ink-dim truncate">{a.group}</div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(a.id)
                }}
                className="text-2xs text-ink-dim hover:text-accent-danger opacity-0 group-hover:opacity-100"
              >
                删除
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TextAssetList({ items, onRemove }: { items: AssetItem[]; onRemove: (id: string) => void }) {
  return (
    <div className="space-y-2">
      {items.map((a) => (
        <div key={a.id} className="bg-panel-deep border border-line p-3 group">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-ink font-medium">{a.name}</span>
            <span className="text-2xs text-accent-dim">
              {a.text?.subcategory && TEXT_SUBCATEGORY_LABELS[a.text.subcategory]}
            </span>
            {a.text?.source && (
              <span className="text-2xs text-ink-dim">· {a.text.source}</span>
            )}
            <button
              onClick={() => onRemove(a.id)}
              className="ml-auto text-2xs text-ink-dim hover:text-accent-danger opacity-0 group-hover:opacity-100"
            >
              删除
            </button>
          </div>
          <div className="text-2xs text-ink-mute leading-relaxed line-clamp-3">
            {a.text?.content || '(无内容)'}
          </div>
        </div>
      ))}
    </div>
  )
}

function AudioAssetList({ items, onRemove }: { items: AssetItem[]; onRemove: (id: string) => void }) {
  return (
    <div className="space-y-1">
      {items.map((a) => (
        <div key={a.id} className="h-9 flex items-center gap-2 px-2 bg-panel-deep border border-line group">
          <button className="w-6 h-6 flex items-center justify-center bg-panel border border-line text-2xs">▶</button>
          <span className="text-xs text-ink truncate flex-1">{a.name}</span>
          <span className="text-2xs text-ink-dim">{a.group}</span>
          <button
            onClick={() => onRemove(a.id)}
            className="text-2xs text-ink-dim hover:text-accent-danger opacity-0 group-hover:opacity-100"
          >
            删除
          </button>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ category }: { category: AssetCategory }) {
  return (
    <div className="h-full flex items-center justify-center text-center">
      <div className="text-ink-dim">
        <div className="text-sm mb-1">暂无{ASSET_CATEGORY_LABELS[category]}素材</div>
        <div className="text-2xs">点击右上角「新增」或切换到「生成新素材」</div>
      </div>
    </div>
  )
}

// ===== 通用组件 =====
function NavItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        'h-8 flex items-center px-3 text-xs text-left border-l-2 transition-colors',
        active
          ? 'bg-accent/10 text-ink border-l-accent'
          : 'text-ink-mute hover:bg-panel-hover hover:text-ink border-l-transparent'
      ].join(' ')}
    >
      {label}
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-3 pb-1 text-2xs text-ink-dim tracking-wide">
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs text-ink-dim mb-1">{label}</div>
      {children}
    </div>
  )
}
