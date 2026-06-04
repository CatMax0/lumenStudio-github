/**
 * AI Provider Service (Main Process)
 *
 * All LLM/Image/TTS API calls go through here.
 * API keys never leave the main process.
 * Renderer communicates via IPC.
 */

import { net } from 'electron'

// ===== Types =====

export interface ProviderConfig {
  kind: string
  name: string
  baseUrl: string
  apiKey: string
  models: string[]
  defaultModel?: string
  headers?: Record<string, string>
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  provider: ProviderConfig
  model?: string
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

export interface ChatResult {
  content: string
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
}

// ===== Non-streaming chat =====

export async function chatCompletion(req: ChatRequest): Promise<ChatResult> {
  const { provider, messages } = req
  const model = req.model || provider.defaultModel || provider.models[0] || 'gpt-4o'
  const temperature = req.temperature ?? 0.7
  const maxTokens = req.maxTokens ?? 4096

  const url = `${provider.baseUrl.replace(/\/$/, '')}/chat/completions`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${provider.apiKey}`,
    ...(provider.headers ?? {})
  }

  const body = JSON.stringify({
    model,
    messages,
    temperature,
    max_tokens: maxTokens
  })

  const data = await fetchJSON(url, { method: 'POST', headers, body })

  const choice = data.choices?.[0]
  if (!choice) throw new Error('[AI] No choices returned')

  return {
    content: choice.message?.content ?? '',
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens ?? 0,
      completionTokens: data.usage.completion_tokens ?? 0,
      totalTokens: data.usage.total_tokens ?? 0
    } : undefined
  }
}

// ===== Streaming chat (returns full text, sends events via callback) =====

export async function chatCompletionStream(
  req: ChatRequest,
  onChunk: (token: string) => void
): Promise<ChatResult> {
  const { provider, messages } = req
  const model = req.model || provider.defaultModel || provider.models[0] || 'gpt-4o'
  const temperature = req.temperature ?? 0.7
  const maxTokens = req.maxTokens ?? 4096

  const url = `${provider.baseUrl.replace(/\/$/, '')}/chat/completions`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${provider.apiKey}`,
    ...(provider.headers ?? {})
  }

  const body = JSON.stringify({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: true
  })

  return new Promise((resolve, reject) => {
    const request = net.request({
      method: 'POST',
      url
    })

    const timeoutId = setTimeout(() => {
      request.abort()
      reject(new Error(`[AI] 流式 API 请求建立连接超时 (超过 60 秒)，请重试`))
    }, 60000)

    for (const [k, v] of Object.entries(headers)) {
      request.setHeader(k, v)
    }

    let full = ''
    let buffer = ''

    request.on('response', (response: Electron.IncomingMessage) => {
      if (response.statusCode !== 200) {
        clearTimeout(timeoutId)
        let errBody = ''
        response.on('data', (chunk: Buffer) => { errBody += chunk.toString() })
        response.on('end', () => {
          reject(new Error(`[AI] ${response.statusCode}: ${errBody.slice(0, 200)}`))
        })
        return
      }

      response.on('data', (chunk: Buffer) => {
        clearTimeout(timeoutId) // Clear timeout once we successfully receive stream content data
        buffer += chunk.toString()
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data:')) continue
          const data = trimmed.slice(5).trim()
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta?.content
            if (delta) {
              full += delta
              onChunk(delta)
            }
          } catch (parseErr) {
            console.warn('[AI] skipping malformed SSE chunk:', data.slice(0, 120), parseErr)
          }
        }
      })

      response.on('end', () => {
        clearTimeout(timeoutId)
        resolve({ content: full })
      })

      response.on('error', (err: Error) => {
        clearTimeout(timeoutId)
        reject(err)
      })
    })

    request.on('error', (err: Error) => {
      clearTimeout(timeoutId)
      reject(err)
    })

    request.write(body)
    request.end()
  })
}

// ===== Utility: fetch JSON via Node http =====

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchJSON(url: string, opts: {
  method: string
  headers: Record<string, string>
  body: string
}): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = net.request({
      method: opts.method,
      url
    })

    const timeoutId = setTimeout(() => {
      request.abort()
      reject(new Error(`[AI] API 请求超时 (超过 60 秒)，可能是由于第三方 API 拥堵，请重试`))
    }, 60000)

    for (const [k, v] of Object.entries(opts.headers)) {
      request.setHeader(k, v)
    }

    let responseBody = ''

    request.on('response', (response: Electron.IncomingMessage) => {
      response.on('data', (chunk: Buffer) => {
        responseBody += chunk.toString()
      })

      response.on('end', () => {
        clearTimeout(timeoutId)
        if (response.statusCode !== 200) {
          reject(new Error(`[AI] ${response.statusCode}: ${responseBody.slice(0, 200)}`))
          return
        }
        try {
          resolve(JSON.parse(responseBody))
        } catch (parseErr) {
          reject(new Error(`[AI] Invalid JSON response: ${responseBody.slice(0, 200)}`))
        }
      })

      response.on('error', (err: Error) => {
        clearTimeout(timeoutId)
        reject(err)
      })
    })

    request.on('error', (err: Error) => {
      clearTimeout(timeoutId)
      reject(err)
    })

    request.write(opts.body)
    request.end()
  })
}
