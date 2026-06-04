import { describe, it, expect } from 'vitest'
import { parseRefs, resolveRefs, detectRefQuery, insertRef, CATEGORY_BADGE } from './refs'
import type { AssetItem } from '../types/project'

describe('parseRefs', () => {
  it('returns empty array for empty string', () => {
    expect(parseRefs('')).toEqual([])
  })

  it('returns empty array for null-ish input', () => {
    expect(parseRefs(undefined as unknown as string)).toEqual([])
  })

  it('parses a single reference', () => {
    const result = parseRefs('Hello {{角色A}} world')
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      name: '角色A',
      start: 6,
      end: 13,
      raw: '{{角色A}}'
    })
  })

  it('parses multiple references', () => {
    const result = parseRefs('{{foo}} and {{bar}}')
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('foo')
    expect(result[1].name).toBe('bar')
  })

  it('trims whitespace inside braces', () => {
    const result = parseRefs('{{ hello }}')
    expect(result[0].name).toBe('hello')
  })

  it('does not match references with newlines', () => {
    const result = parseRefs('{{foo\nbar}}')
    expect(result).toHaveLength(0)
  })

  it('does not match references with closing braces in name', () => {
    const result = parseRefs('{{foo}bar}}')
    expect(result).toHaveLength(0)
  })

  it('handles text with no references', () => {
    expect(parseRefs('plain text without any refs')).toEqual([])
  })

  it('correctly tracks start/end positions for multiple refs', () => {
    const text = 'A {{x}} B {{y}}'
    const refs = parseRefs(text)
    expect(refs[0].start).toBe(2)
    expect(refs[0].end).toBe(7)
    expect(refs[1].start).toBe(10)
    expect(refs[1].end).toBe(15)
  })

  it('handles Chinese characters in ref names', () => {
    const result = parseRefs('描述 {{人物-小明}} 出场')
    expect(result[0].name).toBe('人物-小明')
  })
})

describe('resolveRefs', () => {
  const assets: AssetItem[] = [
    { id: '1', name: 'hero', category: 'character', group: 'main', tags: [], createdAt: 0 },
    { id: '2', name: 'castle', category: 'scene', group: 'bg', tags: [], createdAt: 0 }
  ]

  it('resolves matching assets', () => {
    const refs = parseRefs('{{hero}} enters {{castle}}')
    const resolved = resolveRefs(refs, assets)
    expect(resolved).toHaveLength(2)
    expect(resolved[0].asset?.id).toBe('1')
    expect(resolved[1].asset?.id).toBe('2')
  })

  it('returns null for unmatched refs', () => {
    const refs = parseRefs('{{unknown}}')
    const resolved = resolveRefs(refs, assets)
    expect(resolved[0].asset).toBeNull()
  })

  it('preserves original RefMatch properties', () => {
    const refs = parseRefs('{{hero}}')
    const resolved = resolveRefs(refs, assets)
    expect(resolved[0].name).toBe('hero')
    expect(resolved[0].raw).toBe('{{hero}}')
  })
})

describe('detectRefQuery', () => {
  it('returns null when no {{ exists', () => {
    expect(detectRefQuery('hello world', 11)).toBeNull()
  })

  it('returns query string when caret is inside an open ref', () => {
    expect(detectRefQuery('text {{hel', 10)).toBe('hel')
  })

  it('returns empty string when caret is right after {{', () => {
    expect(detectRefQuery('text {{', 7)).toBe('')
  })

  it('returns null when ref is already closed', () => {
    expect(detectRefQuery('text {{hero}} more', 18)).toBeNull()
  })

  it('returns null when newline appears after {{', () => {
    expect(detectRefQuery('text {{\nstuff', 13)).toBeNull()
  })

  it('handles multiple {{ and picks the last one', () => {
    expect(detectRefQuery('{{done}} text {{que', 19)).toBe('que')
  })

  it('handles caret at position 0', () => {
    expect(detectRefQuery('hello', 0)).toBeNull()
  })
})

describe('insertRef', () => {
  it('inserts ref at caret when not in input mode', () => {
    const result = insertRef('hello ', 6, 'hero')
    expect(result.text).toBe('hello {{hero}}')
    expect(result.caret).toBe(14)
  })

  it('replaces partial ref when in input mode', () => {
    const result = insertRef('text {{he', 9, 'hero')
    expect(result.text).toBe('text {{hero}}')
    expect(result.caret).toBe(13)
  })

  it('preserves text after caret', () => {
    const result = insertRef('before  after', 7, 'mid')
    expect(result.text).toBe('before {{mid}} after')
  })

  it('replaces empty ref input (right after {{)', () => {
    const result = insertRef('text {{', 7, 'hero')
    expect(result.text).toBe('text {{hero}}')
    expect(result.caret).toBe(13)
  })

  it('handles insertion at beginning of text', () => {
    const result = insertRef('hello', 0, 'ref')
    expect(result.text).toBe('{{ref}}hello')
    expect(result.caret).toBe(7)
  })
})

describe('CATEGORY_BADGE', () => {
  it('has entries for all asset categories', () => {
    const categories = ['character', 'scene', 'prop', 'text', 'sfx', 'bgm'] as const
    for (const cat of categories) {
      expect(CATEGORY_BADGE[cat]).toBeDefined()
      expect(CATEGORY_BADGE[cat].char).toBeTruthy()
      expect(CATEGORY_BADGE[cat].cls).toBeTruthy()
    }
  })
})
