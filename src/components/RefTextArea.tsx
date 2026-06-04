import { useRef, useState, useMemo, useEffect, useCallback } from 'react'
import { useProject } from '../store/project'
import {
  parseRefs,
  resolveRefs,
  detectRefQuery,
  insertRef,
  CATEGORY_BADGE
} from '../utils/refs'
import {
  ASSET_CATEGORY_LABELS,
  TEXT_SUBCATEGORY_LABELS
} from '../types/project'
import type { AssetCategory, AssetItem } from '../types/project'

type Props = {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  rows?: number
  showRefs?: boolean
  fieldLabel?: string
}

const DEFAULT_CATS: AssetCategory[] = ['character', 'scene', 'prop', 'text', 'sfx', 'bgm']

export function RefTextArea({
  value,
  onChange,
  placeholder,
  className = '',
  rows = 4,
  showRefs = true,
  fieldLabel
}: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pickerSource, setPickerSource] = useState<'inline' | 'button'>('button')

  const { assets, addAsset } = useProject()

  // 监听光标 / 输入, 检测 {{... 输入态
  const checkInlineTrigger = useCallback(() => {
    const ta = taRef.current
    if (!ta) return
    const q = detectRefQuery(value, ta.selectionStart)
    if (q !== null) {
      setQuery(q)
      setPickerSource('inline')
      setPickerOpen(true)
    } else if (pickerSource === 'inline') {
      setPickerOpen(false)
    }
  }, [value, pickerSource])

  useEffect(() => {
    checkInlineTrigger()
  }, [value, checkInlineTrigger])

  const handlePick = (a: AssetItem) => {
    const ta = taRef.current
    if (!ta) return
    const caret = ta.selectionStart
    const next = insertRef(value, caret, a.name)
    onChange(next.text)
    setPickerOpen(false)
    setQuery('')
    requestAnimationFrame(() => {
      const t = taRef.current
      if (!t) return
      t.focus()
      t.setSelectionRange(next.caret, next.caret)
    })
  }

  const handleQuickCreate = (name: string, cat: AssetCategory) => {
    addAsset({
      name,
      category: cat,
      group: '默认',
      tags: [],
      text: cat === 'text' ? { subcategory: 'custom', content: '' } : undefined
    })
    handlePick({
      id: '',
      name,
      category: cat,
      group: '默认',
      tags: [],
      createdAt: Date.now()
    })
  }

  const renderedRefs = useMemo(() => {
    return resolveRefs(parseRefs(value), assets)
  }, [value, assets])

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-1">
        {fieldLabel && (
          <span className="text-2xs text-ink-dim tracking-wide">{fieldLabel}</span>
        )}
        <button
          type="button"
          onClick={() => {
            setPickerSource('button')
            setQuery('')
            setPickerOpen(true)
            taRef.current?.focus()
          }}
          className="ml-auto text-2xs text-accent hover:underline"
        >
          + 引用素材
        </button>
      </div>

      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && pickerOpen) {
            e.preventDefault()
            setPickerOpen(false)
          }
        }}
        onSelect={checkInlineTrigger}
        rows={rows}
        placeholder={placeholder}
        className={`w-full p-2 bg-panel-deep border border-line text-xs text-ink resize-none focus:border-accent focus:outline-none ${className}`}
      />

      {pickerOpen && (
        <RefPicker
          query={query}
          assets={assets}
          onPick={handlePick}
          onQuickCreate={handleQuickCreate}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {showRefs && <RefList resolved={renderedRefs} />}
    </div>
  )
}

// ===== 引用列表 (编辑器下方) =====
function RefList({ resolved }: { resolved: ReturnType<typeof resolveRefs> }) {
  if (resolved.length === 0) return null

  // 按 name 去重 + 计数
  const map = new Map<string, { name: string; asset: AssetItem | null; count: number }>()
  resolved.forEach((r) => {
    const cur = map.get(r.name)
    if (cur) cur.count++
    else map.set(r.name, { name: r.name, asset: r.asset, count: 1 })
  })
  const items = Array.from(map.values())
  const broken = items.filter((x) => !x.asset).length

  return (
    <div className="mt-2 px-2 py-1.5 bg-panel-deep/60 border border-line-soft">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-2xs text-ink-dim">引用素材 · {items.length}</span>
        {broken > 0 && (
          <span className="text-2xs text-accent-danger">{broken} 个未匹配</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {items.map((it) => (
          <RefChip key={it.name} name={it.name} asset={it.asset} count={it.count} />
        ))}
      </div>
    </div>
  )
}

function RefChip({ name, asset, count }: { name: string; asset: AssetItem | null; count: number }) {
  if (!asset) {
    return (
      <span
        title="未在素材库中找到; 可在素材库中新建同名素材"
        className="inline-flex items-center gap-1 h-5 px-1.5 bg-accent-danger/10 border border-accent-danger/40 text-2xs text-accent-danger"
      >
        <span className="font-mono">!</span>
        <span>{name}</span>
        {count > 1 && <span className="text-ink-dim">×{count}</span>}
      </span>
    )
  }
  const badge = CATEGORY_BADGE[asset.category]
  return (
    <span className="inline-flex items-center gap-1 h-5 pl-0.5 pr-1.5 bg-panel border border-line text-2xs text-ink">
      <span
        className={`inline-flex items-center justify-center w-4 h-4 ${badge.cls} font-medium`}
      >
        {badge.char}
      </span>
      <span>{name}</span>
      {asset.category === 'text' && asset.text?.subcategory && (
        <span className="text-ink-dim">· {TEXT_SUBCATEGORY_LABELS[asset.text.subcategory]}</span>
      )}
      {count > 1 && <span className="text-ink-dim">×{count}</span>}
    </span>
  )
}

// ===== 引用选择器 =====
function RefPicker({
  query,
  assets,
  onPick,
  onQuickCreate,
  onClose
}: {
  query: string
  assets: AssetItem[]
  onPick: (a: AssetItem) => void
  onQuickCreate: (name: string, cat: AssetCategory) => void
  onClose: () => void
}) {
  const [cat, setCat] = useState<AssetCategory | 'all'>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return assets
      .filter((a) => (cat === 'all' ? true : a.category === cat))
      .filter((a) => (q ? a.name.toLowerCase().includes(q) : true))
      .slice(0, 30)
  }, [assets, query, cat])

  const exactMatch = assets.some((a) => a.name === query.trim())
  const canQuickCreate = query.trim().length > 0 && !exactMatch

  // 全局点击关闭
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-ref-picker]') && !target.closest('textarea')) {
        onClose()
      }
    }
    setTimeout(() => document.addEventListener('mousedown', onDoc), 0)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [onClose])

  return (
    <div
      data-ref-picker
      className="absolute z-30 left-0 right-0 mt-1 bg-panel border border-line shadow-lg max-h-72 flex flex-col"
    >
      <div className="h-7 shrink-0 flex items-center gap-0.5 border-b border-line bg-panel-raised text-2xs">
        <CatTab label="全部" active={cat === 'all'} onClick={() => setCat('all')} />
        {DEFAULT_CATS.map((c) => (
          <CatTab
            key={c}
            label={ASSET_CATEGORY_LABELS[c]}
            active={cat === c}
            onClick={() => setCat(c)}
          />
        ))}
        <span className="ml-auto pr-2 text-ink-dim">
          {query ? `搜索: ${query}` : '选择素材'}
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        {filtered.length === 0 && !canQuickCreate && (
          <div className="px-3 py-4 text-center text-2xs text-ink-dim">
            无匹配素材
          </div>
        )}
        {filtered.map((a) => {
          const badge = CATEGORY_BADGE[a.category]
          return (
            <button
              key={a.id}
              onClick={() => onPick(a)}
              className="w-full h-7 px-2 flex items-center gap-2 text-left text-xs hover:bg-panel-hover"
            >
              <span
                className={`inline-flex items-center justify-center w-4 h-4 ${badge.cls} text-2xs font-medium shrink-0`}
              >
                {badge.char}
              </span>
              <span className="text-ink truncate flex-1">{a.name}</span>
              <span className="text-2xs text-ink-dim">
                {a.group}
              </span>
            </button>
          )
        })}
      </div>

      {canQuickCreate && (
        <div className="border-t border-line px-2 py-1.5 bg-panel-deep">
          <div className="text-2xs text-ink-dim mb-1">快速创建并引用「{query.trim()}」</div>
          <div className="flex gap-1 flex-wrap">
            {DEFAULT_CATS.map((c) => (
              <button
                key={c}
                onClick={() => onQuickCreate(query.trim(), c)}
                className="h-5 px-1.5 bg-panel border border-line text-2xs text-ink-mute hover:bg-accent/20 hover:text-ink"
              >
                <span className={`mr-1 ${CATEGORY_BADGE[c].cls.split(' ')[1]}`}>
                  {CATEGORY_BADGE[c].char}
                </span>
                {ASSET_CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CatTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        'h-full px-2 transition-colors',
        active ? 'text-ink bg-panel border-b border-accent' : 'text-ink-dim hover:text-ink-mute'
      ].join(' ')}
    >
      {label}
    </button>
  )
}
