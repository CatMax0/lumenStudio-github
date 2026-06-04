import type { ModelProvider } from '../types/project'

/**
 * 把 Provider 的 baseUrl 归一化成稳定的「平台」标识。
 * 聚合平台（如硅基流动 SiliconFlow、302.AI）在不同模型类型下共用同一个 host，
 * 因此以 host 作为平台标识，用于分组并共享同一个 API Key。
 * 无可用 baseUrl 时返回 ''（视为「无平台」，不参与共享）。
 */
export function platformId(baseUrl: string | undefined): string {
  const b = (baseUrl || '').trim()
  if (!b) return ''
  try {
    return new URL(b).host.toLowerCase()
  } catch {
    return b.toLowerCase().replace(/\/+$/, '')
  }
}

/** 两个 baseUrl 是否属于同一平台。 */
export function samePlatform(a: string | undefined, b: string | undefined): boolean {
  const pa = platformId(a)
  return pa !== '' && pa === platformId(b)
}

/**
 * 查找该平台已配置好的 API Key（忽略 id 为 excludeId 的 Provider）。
 * 用于新增同平台模型时自动继承已有 Key。
 */
export function findPlatformApiKey(
  providers: ModelProvider[],
  baseUrl: string | undefined,
  excludeId?: string
): string {
  const pid = platformId(baseUrl)
  if (!pid) return ''
  const match = providers.find(
    (p) => p.id !== excludeId && !!p.apiKey && platformId(p.baseUrl) === pid
  )
  return match?.apiKey ?? ''
}

/** 与 provider 属于同一平台的其它 Provider（不含自身）。 */
export function samePlatformProviders(
  providers: ModelProvider[],
  provider: ModelProvider
): ModelProvider[] {
  const pid = platformId(provider.baseUrl)
  if (!pid) return []
  return providers.filter((p) => p.id !== provider.id && platformId(p.baseUrl) === pid)
}
