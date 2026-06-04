import { describe, it, expect } from 'vitest'
import { platformId, samePlatform, findPlatformApiKey, samePlatformProviders } from './platform'
import type { ModelProvider } from '../types/project'

function mk(partial: Partial<ModelProvider> & { id: string }): ModelProvider {
  return {
    id: partial.id,
    kind: partial.kind ?? 'llm',
    name: partial.name ?? partial.id,
    baseUrl: partial.baseUrl ?? '',
    apiKey: partial.apiKey ?? '',
    models: partial.models ?? [],
    enabled: partial.enabled ?? false,
    ...partial
  }
}

describe('platformId', () => {
  it('returns empty string for missing baseUrl', () => {
    expect(platformId('')).toBe('')
    expect(platformId(undefined)).toBe('')
    expect(platformId('   ')).toBe('')
  })

  it('uses the host (ignoring path/scheme) so aggregation platforms collapse to one id', () => {
    expect(platformId('https://api.siliconflow.cn/v1')).toBe('api.siliconflow.cn')
    expect(platformId('https://api.siliconflow.cn/v1/')).toBe('api.siliconflow.cn')
    expect(platformId('https://api.302.ai/v1')).toBe('api.302.ai')
  })

  it('treats different model kinds on the same host as the same platform', () => {
    // SiliconFlow LLM vs image vs video all share the host
    expect(platformId('https://api.siliconflow.cn/v1')).toBe(
      platformId('https://api.siliconflow.cn/v1')
    )
  })

  it('keeps host + port so distinct local services stay separate', () => {
    expect(platformId('http://localhost:11434/v1')).toBe('localhost:11434')
    expect(platformId('http://127.0.0.1:8188')).toBe('127.0.0.1:8188')
    expect(platformId('http://localhost:11434/v1')).not.toBe(platformId('http://localhost:8080'))
  })

  it('falls back to a normalized string for non-URL sentinels', () => {
    expect(platformId('edge-tts')).toBe('edge-tts')
  })

  it('is case-insensitive on host', () => {
    expect(platformId('https://API.SiliconFlow.CN/v1')).toBe('api.siliconflow.cn')
  })
})

describe('samePlatform', () => {
  it('matches different paths on the same host', () => {
    expect(samePlatform('https://api.siliconflow.cn/v1', 'https://api.siliconflow.cn/v1/audio')).toBe(true)
  })

  it('does not match across hosts', () => {
    expect(samePlatform('https://api.siliconflow.cn/v1', 'https://api.openai.com/v1')).toBe(false)
  })

  it('never matches when either side has no platform', () => {
    expect(samePlatform('', '')).toBe(false)
    expect(samePlatform('https://api.siliconflow.cn/v1', '')).toBe(false)
  })
})

describe('findPlatformApiKey', () => {
  const providers: ModelProvider[] = [
    mk({ id: 'a', kind: 'llm', baseUrl: 'https://api.siliconflow.cn/v1', apiKey: 'sk-sf' }),
    mk({ id: 'b', kind: 'image', baseUrl: 'https://api.siliconflow.cn/v1', apiKey: '' }),
    mk({ id: 'c', kind: 'llm', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-oa' })
  ]

  it('finds an existing key for the same platform', () => {
    expect(findPlatformApiKey(providers, 'https://api.siliconflow.cn/v1')).toBe('sk-sf')
  })

  it('finds the key even from a different path on the same host', () => {
    expect(findPlatformApiKey(providers, 'https://api.siliconflow.cn/v1/audio')).toBe('sk-sf')
  })

  it('excludes the given provider id', () => {
    // Only provider "a" has a key on this platform; excluding it yields nothing
    expect(findPlatformApiKey(providers, 'https://api.siliconflow.cn/v1', 'a')).toBe('')
  })

  it('returns empty when no platform key exists', () => {
    expect(findPlatformApiKey(providers, 'https://api.unknown.com/v1')).toBe('')
  })

  it('returns empty for no platform', () => {
    expect(findPlatformApiKey(providers, '')).toBe('')
  })
})

describe('samePlatformProviders', () => {
  const providers: ModelProvider[] = [
    mk({ id: 'a', kind: 'llm', baseUrl: 'https://api.siliconflow.cn/v1' }),
    mk({ id: 'b', kind: 'image', baseUrl: 'https://api.siliconflow.cn/v1' }),
    mk({ id: 'c', kind: 'video', baseUrl: 'https://api.siliconflow.cn/v1' }),
    mk({ id: 'd', kind: 'llm', baseUrl: 'https://api.openai.com/v1' })
  ]

  it('returns other providers on the same platform, excluding self', () => {
    const siblings = samePlatformProviders(providers, providers[0])
    expect(siblings.map((p) => p.id).sort()).toEqual(['b', 'c'])
  })

  it('returns empty for a provider with no platform', () => {
    const blank = mk({ id: 'x', baseUrl: '' })
    expect(samePlatformProviders([...providers, blank], blank)).toEqual([])
  })
})
