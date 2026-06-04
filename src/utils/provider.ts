import type { ModelProvider } from '../types/project'

/**
 * Strip a ModelProvider down to the serializable config shape
 * expected by the main-process IPC handlers.
 */
export function toProviderConfig(p: ModelProvider) {
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
