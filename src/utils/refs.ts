import type { AssetItem, AssetCategory } from '../types/project'

/**
 * 引用语法: {{素材名}}
 *  - 名称中允许中文/英文/数字/常见符号, 但禁止 } 与换行
 *  - 同一名称多次出现合并显示, 但保留每个位置
 */

export interface RefMatch {
  name: string
  start: number
  end: number
  raw: string
}

export interface ResolvedRef extends RefMatch {
  asset: AssetItem | null
}

const REF_REGEX = /\{\{([^}\n]+?)\}\}/g

export function parseRefs(text: string): RefMatch[] {
  const out: RefMatch[] = []
  if (!text) return out
  let m: RegExpExecArray | null
  REF_REGEX.lastIndex = 0
  while ((m = REF_REGEX.exec(text))) {
    out.push({
      name: m[1].trim(),
      start: m.index,
      end: m.index + m[0].length,
      raw: m[0]
    })
  }
  return out
}

export function resolveRefs(refs: RefMatch[], assets: AssetItem[]): ResolvedRef[] {
  return refs.map((r) => ({
    ...r,
    asset: assets.find((a) => a.name === r.name) ?? null
  }))
}

/**
 * 检测文本编辑器当前光标处是否处于"输入引用"状态
 * 即光标前最近的 `{{` 之后没有 `}}` 闭合
 * 返回查询字串 (用于过滤 picker)，若不在引用输入态则返回 null
 */
export function detectRefQuery(text: string, caret: number): string | null {
  const before = text.slice(0, caret)
  const lastOpen = before.lastIndexOf('{{')
  if (lastOpen === -1) return null
  const between = before.slice(lastOpen + 2)
  if (between.includes('}}') || between.includes('\n')) return null
  return between
}

/**
 * 在光标处插入引用; 若处于引用输入态则替换 `{{query` 为 `{{name}}`
 */
export function insertRef(
  text: string,
  caret: number,
  name: string
): { text: string; caret: number } {
  const before = text.slice(0, caret)
  const after = text.slice(caret)
  const lastOpen = before.lastIndexOf('{{')
  const inInput =
    lastOpen !== -1 &&
    !before.slice(lastOpen + 2).includes('}}') &&
    !before.slice(lastOpen + 2).includes('\n')
  if (inInput) {
    const newBefore = before.slice(0, lastOpen) + `{{${name}}}`
    return { text: newBefore + after, caret: newBefore.length }
  }
  const newBefore = before + `{{${name}}}`
  return { text: newBefore + after, caret: newBefore.length }
}

export const CATEGORY_BADGE: Record<AssetCategory, { char: string; cls: string }> = {
  character: { char: '人', cls: 'bg-blue-500/20 text-blue-300' },
  scene:     { char: '景', cls: 'bg-emerald-500/20 text-emerald-300' },
  prop:      { char: '物', cls: 'bg-amber-500/20 text-amber-300' },
  text:      { char: '文', cls: 'bg-purple-500/20 text-purple-300' },
  sfx:       { char: '声', cls: 'bg-pink-500/20 text-pink-300' },
  bgm:       { char: '乐', cls: 'bg-cyan-500/20 text-cyan-300' }
}
