import { describe, it, expect } from 'vitest'
import {
  STAGES,
  STAGE_LABELS,
  EMPTY_WORLD_BUILDING,
  chapterLabel,
  shotLabel,
  CAMERA_LABELS,
  ASSET_CATEGORY_LABELS,
  TEXT_SUBCATEGORY_LABELS,
  MODEL_KIND_LABELS,
  GENDER_LABELS,
  ASSET_GEN_TOOL_LABELS
} from './project'
import type { Chapter, CameraType, AssetCategory, Stage, ModelKind } from './project'

describe('STAGES', () => {
  it('contains all expected stages in order', () => {
    expect(STAGES).toEqual([
      'projects', 'worldbuilding', 'outline', 'chapter',
      'storyboard', 'generate', 'library', 'settings'
    ])
  })
})

describe('STAGE_LABELS', () => {
  it('has a label for every stage', () => {
    for (const stage of STAGES) {
      expect(STAGE_LABELS[stage]).toBeTruthy()
    }
  })
})

describe('EMPTY_WORLD_BUILDING', () => {
  it('has correct defaults', () => {
    expect(EMPTY_WORLD_BUILDING.synopsis).toBe('')
    expect(EMPTY_WORLD_BUILDING.characters).toBe('')
    expect(EMPTY_WORLD_BUILDING.pace).toBe('快节奏')
    expect(EMPTY_WORLD_BUILDING.episodeMinutes).toBe(2)
    expect(EMPTY_WORLD_BUILDING.totalEpisodes).toBe(12)
  })
})

describe('chapterLabel', () => {
  const makeChapter = (actIndex: number, chapterIndex: number): Chapter => ({
    id: 'ch-1',
    actId: 'act-1',
    actIndex,
    chapterIndex,
    title: 'Test Chapter',
    synopsis: '',
    chapterSummary: '',
    characterStates: '',
    currentTask: '',
    chapterGoal: '',
    scenes: [],
    assetRefs: []
  })

  it('formats as actIndex-chapterIndex', () => {
    expect(chapterLabel(makeChapter(1, 2))).toBe('1-2')
  })

  it('handles larger indices', () => {
    expect(chapterLabel(makeChapter(5, 10))).toBe('5-10')
  })

  it('handles index 0', () => {
    expect(chapterLabel(makeChapter(0, 0))).toBe('0-0')
  })
})

describe('shotLabel', () => {
  const makeChapter = (actIndex: number, chapterIndex: number): Chapter => ({
    id: 'ch-1',
    actId: 'act-1',
    actIndex,
    chapterIndex,
    title: 'Test',
    synopsis: '',
    chapterSummary: '',
    characterStates: '',
    currentTask: '',
    chapterGoal: '',
    scenes: [],
    assetRefs: []
  })

  it('formats as actIndex-chapterIndex-shotIndex', () => {
    expect(shotLabel(makeChapter(1, 2), 3)).toBe('1-2-3')
  })

  it('handles index 0', () => {
    expect(shotLabel(makeChapter(0, 0), 0)).toBe('0-0-0')
  })
})

describe('CAMERA_LABELS', () => {
  it('has labels for all camera types', () => {
    const types: CameraType[] = ['wide', 'medium', 'close-up', 'over-shoulder', 'pov', 'aerial', 'tracking']
    for (const t of types) {
      expect(CAMERA_LABELS[t]).toBeTruthy()
    }
  })
})

describe('ASSET_CATEGORY_LABELS', () => {
  it('has labels for all asset categories', () => {
    const categories: AssetCategory[] = ['character', 'scene', 'prop', 'text', 'sfx', 'bgm']
    for (const c of categories) {
      expect(ASSET_CATEGORY_LABELS[c]).toBeTruthy()
    }
  })
})

describe('TEXT_SUBCATEGORY_LABELS', () => {
  it('has labels for all text subcategories', () => {
    const subs = ['history', 'taoism', 'mantra', 'iching', 'astrology', 'science', 'lore', 'custom'] as const
    for (const s of subs) {
      expect(TEXT_SUBCATEGORY_LABELS[s]).toBeTruthy()
    }
  })
})

describe('MODEL_KIND_LABELS', () => {
  it('has labels for all model kinds', () => {
    const kinds: ModelKind[] = ['llm', 'image', 'tts', 'stt', 'video', 'translate']
    for (const k of kinds) {
      expect(MODEL_KIND_LABELS[k]).toBeTruthy()
    }
  })
})

describe('GENDER_LABELS', () => {
  it('has labels for all genders', () => {
    const genders = ['male', 'female', 'neutral', 'unknown'] as const
    for (const g of genders) {
      expect(GENDER_LABELS[g]).toBeTruthy()
    }
  })
})

describe('ASSET_GEN_TOOL_LABELS', () => {
  it('has labels for all asset gen tools', () => {
    const tools = [
      'three-view-character', 'three-view-scene', 'three-view-prop',
      'tts-preview', 'sfx-search', 'text-extract'
    ] as const
    for (const t of tools) {
      expect(ASSET_GEN_TOOL_LABELS[t]).toBeTruthy()
    }
  })
})
