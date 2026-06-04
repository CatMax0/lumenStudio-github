import type { ModelProvider } from '../types/project'

function toProviderConfig(p: ModelProvider) {
  return {
    kind: p.kind,
    name: p.name,
    baseUrl: p.baseUrl,
    apiKey: p.apiKey,
    models: p.models,
    defaultModel: p.defaultModel,
    headers: p.headers
  }
}

export async function generateMedia(opts: {
  provider: ModelProvider
  prompt: string
  kind: 'image' | 'video'
  model?: string
  shotId?: string
  projectId?: string
  ratio?: string
  duration?: number
  imageUrl?: string
  imageUrls?: string[]
}): Promise<{ path: string; url?: string }> {
  const api = (window as unknown as { lumen?: { ai?: {
    generateMedia?: (req: unknown) => Promise<{ path: string; url?: string }>
  } } }).lumen?.ai
  if (!api?.generateMedia) throw new Error('当前环境不支持媒体生成 IPC')
  return api.generateMedia({
    provider: toProviderConfig(opts.provider),
    prompt: opts.prompt,
    kind: opts.kind,
    model: opts.model,
    shotId: opts.shotId,
    projectId: opts.projectId,
    ratio: opts.ratio,
    duration: opts.duration,
    imageUrl: opts.imageUrl,
    imageUrls: opts.imageUrls
  })
}
