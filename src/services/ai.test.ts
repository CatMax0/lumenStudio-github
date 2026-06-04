import { describe, it, expect } from 'vitest'
import { VISUAL_STYLE_PROMPTS, PROMPTS } from './ai'

describe('VISUAL_STYLE_PROMPTS', () => {
  it('has all expected style keys', () => {
    expect(VISUAL_STYLE_PROMPTS).toHaveProperty('realistic')
    expect(VISUAL_STYLE_PROMPTS).toHaveProperty('anime')
    expect(VISUAL_STYLE_PROMPTS).toHaveProperty('ink')
    expect(VISUAL_STYLE_PROMPTS).toHaveProperty('cyberpunk')
    expect(VISUAL_STYLE_PROMPTS).toHaveProperty('custom')
  })

  it('has non-empty prompts for non-custom styles', () => {
    expect(VISUAL_STYLE_PROMPTS.realistic.length).toBeGreaterThan(0)
    expect(VISUAL_STYLE_PROMPTS.anime.length).toBeGreaterThan(0)
    expect(VISUAL_STYLE_PROMPTS.ink.length).toBeGreaterThan(0)
    expect(VISUAL_STYLE_PROMPTS.cyberpunk.length).toBeGreaterThan(0)
  })

  it('has empty string for custom style', () => {
    expect(VISUAL_STYLE_PROMPTS.custom).toBe('')
  })
})

describe('PROMPTS.generateWorldBuilding', () => {
  it('returns a messages array with system and user roles', () => {
    const msgs = PROMPTS.generateWorldBuilding('Fantasy', 'Drama', '')
    expect(msgs).toHaveLength(2)
    expect(msgs[0].role).toBe('system')
    expect(msgs[1].role).toBe('user')
  })

  it('includes theme and genre in user message', () => {
    const msgs = PROMPTS.generateWorldBuilding('Sci-fi', 'Action', '')
    expect(msgs[1].content).toContain('Sci-fi')
    expect(msgs[1].content).toContain('Action')
  })

  it('includes extra instructions when provided', () => {
    const msgs = PROMPTS.generateWorldBuilding('Fantasy', 'RPG', 'Make it dark')
    expect(msgs[1].content).toContain('Make it dark')
  })

  it('omits extra instructions when empty', () => {
    const msgs = PROMPTS.generateWorldBuilding('Fantasy', 'RPG', '')
    expect(msgs[1].content).not.toContain('额外要求')
  })
})

describe('PROMPTS.generateOutline', () => {
  it('returns a messages array with system and user roles', () => {
    const msgs = PROMPTS.generateOutline('Theme', 'Style', '', '')
    expect(msgs).toHaveLength(2)
    expect(msgs[0].role).toBe('system')
    expect(msgs[1].role).toBe('user')
  })

  it('includes theme and style', () => {
    const msgs = PROMPTS.generateOutline('Mystery', 'Noir', '', '')
    expect(msgs[1].content).toContain('Mystery')
    expect(msgs[1].content).toContain('Noir')
  })

  it('includes world building context when provided', () => {
    const msgs = PROMPTS.generateOutline('Theme', 'Style', 'World info here', '')
    expect(msgs[1].content).toContain('World info here')
  })

  it('includes extra instructions when provided', () => {
    const msgs = PROMPTS.generateOutline('Theme', 'Style', '', 'Add twist')
    expect(msgs[1].content).toContain('Add twist')
  })
})

describe('PROMPTS.generateChapter', () => {
  it('returns a messages array with system and user roles', () => {
    const msgs = PROMPTS.generateChapter({
      storyPoint: 'Point 1',
      storyPointGoal: 'Goal 1',
      chapterLabel: '1-1',
      worldBuildingContext: '',
      recentSummaries: '',
      characterStates: '',
      currentTask: '',
      chapterGoal: '',
      extraInstructions: ''
    })
    expect(msgs).toHaveLength(2)
    expect(msgs[0].role).toBe('system')
    expect(msgs[1].role).toBe('user')
  })

  it('includes story point and chapter label', () => {
    const msgs = PROMPTS.generateChapter({
      storyPoint: 'The Conflict',
      storyPointGoal: 'Resolve tensions',
      chapterLabel: '2-3',
      worldBuildingContext: 'Fantasy world',
      recentSummaries: 'Previous events...',
      characterStates: 'Hero is injured',
      currentTask: 'Escape',
      chapterGoal: 'Reach safety',
      extraInstructions: 'Include flashback'
    })
    const content = msgs[1].content
    expect(content).toContain('The Conflict')
    expect(content).toContain('2-3')
    expect(content).toContain('Fantasy world')
    expect(content).toContain('Include flashback')
  })
})
