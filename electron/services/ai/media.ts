import { app } from 'electron'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import type { ProviderConfig } from './index'

export interface MediaGenerateRequest {
  provider: ProviderConfig
  prompt: string
  kind: 'image' | 'video'
  model?: string
  shotId?: string
  projectId?: string
  ratio?: string
  duration?: number
  imageUrl?: string
  imageUrls?: string[]
}

export interface MediaGenerateResult {
  path: string
  url?: string
}

/** @internal */
export function extFromContentType(contentType: string, fallback: string): string {
  if (contentType.includes('png')) return '.png'
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return '.jpg'
  if (contentType.includes('webp')) return '.webp'
  if (contentType.includes('mp4')) return '.mp4'
  return fallback
}

async function fetchWithTimeout(url: string, options: RequestInit & { timeout?: number } = {}): Promise<Response> {
  const { timeout = 45000, ...rest } = options
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    return await fetch(url, {
      ...rest,
      signal: controller.signal
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`[media] 请求 ${url} 响应超时 (超过 ${timeout / 1000} 秒)，可能是接口服务器拥堵，请重试`)
    }
    throw err
  } finally {
    clearTimeout(id)
  }
}

async function saveRemote(url: string, fallbackExt: string, projectId?: string): Promise<string> {
  const resp = await fetchWithTimeout(url, { timeout: 60000 }) // Download can take up to 60 seconds
  if (!resp.ok) throw new Error(`[media] download failed ${resp.status}`)
  const buf = Buffer.from(await resp.arrayBuffer())
  const dir = projectId
    ? path.join(app.getPath('userData'), 'projects', projectId, 'generated')
    : path.join(app.getPath('userData'), 'generated')
  await fs.mkdir(dir, { recursive: true })
  const ext = extFromContentType(resp.headers.get('content-type') ?? '', fallbackExt)
  const file = path.join(dir, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`)
  await fs.writeFile(file, buf)
  return file
}

async function saveBase64(base64Data: string, fallbackExt: string, projectId?: string): Promise<string> {
  const buf = Buffer.from(base64Data, 'base64')
  const dir = projectId
    ? path.join(app.getPath('userData'), 'projects', projectId, 'generated')
    : path.join(app.getPath('userData'), 'generated')
  await fs.mkdir(dir, { recursive: true })
  const file = path.join(dir, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${fallbackExt}`)
  await fs.writeFile(file, buf)
  return file
}

async function postJSON(url: string, apiKey: string, body: unknown): Promise<unknown> {
  const resp = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body),
    timeout: 45000 // 45 seconds timeout for API submissions
  })
  const text = await resp.text()
  if (!resp.ok) throw new Error(`[media] POST ${url} ${resp.status}: ${text.slice(0, 500)}`)
  return JSON.parse(text)
}

async function getJSON(url: string, apiKey: string): Promise<unknown> {
  const resp = await fetchWithTimeout(url, { 
    headers: { Authorization: `Bearer ${apiKey}` },
    timeout: 30000 // 30 seconds for checking task status
  })
  const text = await resp.text()
  if (!resp.ok) throw new Error(`[media] ${resp.status}: ${text.slice(0, 500)}`)
  return JSON.parse(text)
}

/** @internal */
export function pickUrl(value: unknown): string | undefined {
  const obj = value as Record<string, unknown>
  const data = obj.data as unknown[] | undefined
  const first = data?.[0] as Record<string, unknown> | undefined
  return (first?.url as string | undefined)
    ?? (obj.url as string | undefined)
    ?? ((obj.content as Record<string, unknown> | undefined)?.video_url as string | undefined)
    ?? ((obj.result as Record<string, unknown> | undefined)?.url as string | undefined)
}

/** @internal */
export function pickTaskId(value: unknown): string | undefined {
  const obj = value as Record<string, unknown>
  return (obj.id as string | undefined)
    ?? (obj.task_id as string | undefined)
    ?? ((obj.data as Record<string, unknown> | undefined)?.id as string | undefined)
    ?? ((obj.data as Record<string, unknown> | undefined)?.task_id as string | undefined)
}

/** @internal */
export function pickStatus(value: unknown): string {
  const obj = value as Record<string, unknown>
  return String(obj.status ?? (obj.data as Record<string, unknown> | undefined)?.status ?? '')
}

async function pollTask(base: string, apiKey: string, taskId: string, fallbackExt: string, projectId?: string): Promise<MediaGenerateResult> {
  for (let i = 0; i < 90; i++) {
    await new Promise((resolve) => setTimeout(resolve, 3000))
    const statusJson = await getJSON(`${base}/contents/generations/tasks/${taskId}`, apiKey)
    const status = pickStatus(statusJson).toLowerCase()
    const url = pickUrl(statusJson)
    if (url && ['succeeded', 'success', 'completed', 'done'].some((s) => status.includes(s))) {
      return { path: await saveRemote(url, fallbackExt, projectId), url }
    }
    if (['failed', 'error', 'cancelled'].some((s) => status.includes(s))) {
      throw new Error(`[media] task failed: ${JSON.stringify(statusJson).slice(0, 500)}`)
    }
  }
  throw new Error('[media] task timeout')
}

import * as crypto from 'node:crypto'

/** @internal */
export function base64UrlEncode(str: string | Buffer): string {
  const buf = typeof str === 'string' ? Buffer.from(str) : str
  return buf.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

/** @internal */
export function generateKlingJWT(accessKey: string, secretKey: string): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: accessKey,
    iat: now,
    exp: now + 1800
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signatureInput = `${encodedHeader}.${encodedPayload}`

  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(signatureInput)
    .digest()

  const encodedSignature = base64UrlEncode(signature)
  return `${signatureInput}.${encodedSignature}`
}

function assembleXunfeiUrl(requestUrl: string, method: string, apiKeyStr: string): string {
  const parts = apiKeyStr.split(':')
  const apiKey = parts[1] || ''
  const apiSecret = parts[2] || ''

  const urlObj = new URL(requestUrl)
  const host = urlObj.host
  const path = urlObj.pathname

  const date = new Date().toUTCString()
  const signatureOrigin = `host: ${host}\ndate: ${date}\n${method} ${path} HTTP/1.1`

  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(signatureOrigin)
    .digest('base64')

  const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`
  const authorization = Buffer.from(authorizationOrigin).toString('base64')

  const params = new URLSearchParams({
    host,
    date,
    authorization
  })

  return `${requestUrl}?${params.toString()}`
}

export async function generateMedia(req: MediaGenerateRequest): Promise<MediaGenerateResult> {
  const { provider, prompt, kind } = req
  const base = provider.baseUrl.replace(/\/+$/, '')
  const model = req.model || provider.defaultModel || provider.models[0]
  if (!model) throw new Error('[media] missing model')

  const isVolcArk = base.includes('volces.com/api/v3')
  const isSiliconFlow = base.includes('api.siliconflow.cn') || base.includes('api.siliconflow.com')
  const isKling = base.includes('api.klingai.com') || base.includes('klingai.com')
  const isXunfei = base.includes('xf-yun.com') || base.includes('xfyun.cn')
  let effectiveModel = model
  if (isVolcArk && kind === 'image' && model.includes('seedream') && !model.includes('5-0')) {
    effectiveModel = 'doubao-seedream-5-0-260128'
    console.log(`[media] auto-fix deprecated model ${model} -> ${effectiveModel}`)
  }
  console.log(`[media] ${kind} model=${effectiveModel} base=${base}`)

  if (kind === 'image') {
    if (isXunfei) {
      const parts = provider.apiKey.split(':')
      if (parts.length < 3) {
        throw new Error('[media] 讯飞接口需要配置为 APPID:APIKey:APISecret 格式，请在设置中重新填写。')
      }
      const appId = parts[0]
      const patchId = parts[3] || ''

      const signedUrl = assembleXunfeiUrl(`${base}`, 'POST', provider.apiKey)

      const isQwen = effectiveModel.toLowerCase().includes('qwen') || effectiveModel.toLowerCase().includes('xop')
      let width = 1024
      let height = 1024

      if (isQwen) {
        // Qwen 绘图模型（如 xopqwentti20b）通常仅支持 1024x1024 或 768x768 等正方形分辨率
        width = 1024
        height = 1024
      } else {
        width = req.ratio === '9:16' ? 576 : req.ratio === '1:1' ? 1024 : 1024
        height = req.ratio === '9:16' ? 1024 : req.ratio === '1:1' ? 1024 : 576
      }

      const header: any = {
        app_id: appId,
        uid: '123456789',
        patch_id: patchId ? [patchId] : [""]
      }

      const chatParams: any = {
        domain: effectiveModel
      }
      if (!isQwen) {
        chatParams.width = width
        chatParams.height = height
      }

      const payload = {
        header,
        parameter: {
          chat: chatParams
        },
        payload: {
          message: {
            text: [
              {
                role: 'user',
                content: prompt
              }
            ]
          }
        }
      }

      console.log(`[media] xunfei request payload:`, JSON.stringify(payload))

      const resp = await fetchWithTimeout(signedUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        timeout: 60000
      })

      const text = await resp.text()
      if (!resp.ok) {
        throw new Error(`[media] 讯飞接口请求失败 status=${resp.status}: ${text.slice(0, 500)}`)
      }

      const json = JSON.parse(text)
      const code = json.header?.code
      if (code !== 0) {
        throw new Error(`[media] 讯飞接口返回错误 code=${code}: ${json.header?.message || '未知错误'}`)
      }

      const imageContent = json.payload?.choices?.text?.[0]?.content
      if (!imageContent) {
        throw new Error('[media] 讯飞接口返回的数据中未找到图片数据')
      }

      const savedPath = await saveBase64(imageContent, '.png', req.projectId)
      return { path: savedPath }
    }

    const json = await postJSON(`${base}/images/generations`, provider.apiKey, {
      model: effectiveModel,
      prompt,
      ...(isVolcArk ? {
        sequential_image_generation: 'disabled',
        size: '2K',
        stream: false,
        watermark: true
      } : {
        size: req.ratio === '9:16' ? '1024x1792' : req.ratio === '1:1' ? '1024x1024' : '1792x1024'
      }),
      response_format: 'url'
    })
    const url = pickUrl(json)
    if (!url) throw new Error('[media] image url not found')
    return { path: await saveRemote(url, '.png', req.projectId), url }
  }

  if (isSiliconFlow) {
    const payload: Record<string, unknown> = {
      model: effectiveModel,
      prompt,
      image_size: req.ratio === '9:16' ? '720x1280' : req.ratio === '1:1' ? '1024x1024' : '1280x720'
    }
    if (req.imageUrl) {
      payload.image = req.imageUrl
    } else if (req.imageUrls && req.imageUrls.length > 0) {
      payload.image = req.imageUrls[0]
    }
    console.log(`[media] siliconflow video submission: ${JSON.stringify(payload)}`)
    const created = await postJSON(`${base}/video/submit`, provider.apiKey, payload)
    const requestId = (created as any).requestId
    if (!requestId) throw new Error(`[media] siliconflow video task submission failed: ${JSON.stringify(created)}`)
    
    console.log(`[media] siliconflow video task submitted: requestId=${requestId}. Polling...`)
    for (let i = 0; i < 90; i++) {
      await new Promise((resolve) => setTimeout(resolve, 3000))
      const statusJson = await postJSON(`${base}/video/status`, provider.apiKey, { requestId })
      const status = String((statusJson as any).status || '').toLowerCase()
      console.log(`[media] siliconflow polling task ${requestId} status=${status}`)
      
      if (status === 'succeed') {
        const url = (statusJson as any).results?.videos?.[0]?.url
        if (!url) throw new Error('[media] siliconflow video url not found in success response')
        return { path: await saveRemote(url, '.mp4', req.projectId), url }
      }
      if (['failed', 'error', 'cancelled'].some((s) => status.includes(s))) {
        throw new Error(`[media] siliconflow task failed: ${JSON.stringify(statusJson).slice(0, 500)}`)
      }
    }
    throw new Error('[media] siliconflow video task timeout')
  }

  if (isKling) {
    let token = provider.apiKey
    if (provider.apiKey.includes(':')) {
      const [accessKey, secretKey] = provider.apiKey.split(':')
      token = generateKlingJWT(accessKey, secretKey)
    }

    const dur = req.duration ?? 5
    let submitEndpoint = `${base}/v1/videos/text-to-video`
    let payload: Record<string, unknown> = {
      model: effectiveModel,
      prompt,
      aspect_ratio: req.ratio === '9:16' ? '9:16' : req.ratio === '1:1' ? '1:1' : '16:9',
      duration: String(dur),
      mode: 'std'
    }

    if (req.imageUrls && req.imageUrls.length > 0) {
      submitEndpoint = `${base}/v1/videos/image-to-video`
      payload = {
        model: effectiveModel,
        image: req.imageUrls[0],
        prompt: prompt,
        duration: String(dur),
        mode: 'std'
      }
      if (req.imageUrls.length > 1) {
        payload.image_tail = req.imageUrls[1]
      }
    } else if (req.imageUrl) {
      submitEndpoint = `${base}/v1/videos/image-to-video`
      payload = {
        model: effectiveModel,
        image: req.imageUrl,
        prompt: prompt,
        duration: String(dur),
        mode: 'std'
      }
    }

    console.log(`[media] Kling task submission endpoint=${submitEndpoint} payload=${JSON.stringify(payload)}`)
    
    const created = await fetchWithTimeout(submitEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload),
      timeout: 45000
    }).then(async (r) => {
      const text = await r.text()
      if (!r.ok) throw new Error(`[media] Kling submit task failed status=${r.status}: ${text}`)
      return JSON.parse(text)
    })

    const taskId = created.data?.task_id
    if (!taskId) {
      throw new Error(`[media] Kling task ID not found in response: ${JSON.stringify(created)}`)
    }

    console.log(`[media] Kling task submitted successfully, taskId=${taskId}. Polling...`)

    for (let i = 0; i < 90; i++) {
      await new Promise((resolve) => setTimeout(resolve, 3000))
      const statusJson = await fetchWithTimeout(`${base}/v1/videos/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 30000
      }).then(async (r) => {
        const text = await r.text()
        if (!r.ok) throw new Error(`[media] Kling poll task failed status=${r.status}: ${text}`)
        return JSON.parse(text)
      })

      const status = String(statusJson.data?.task_status || '').toLowerCase()
      console.log(`[media] Kling polling task ${taskId} status=${status}`)

      if (status === 'succeeded') {
        const url = statusJson.data?.task_result?.videos?.[0]?.url
        if (!url) throw new Error('[media] Kling video url not found in succeeded response')
        return { path: await saveRemote(url, '.mp4', req.projectId), url }
      }
      if (['failed', 'error', 'cancelled'].some((s) => status.includes(s))) {
        throw new Error(`[media] Kling task failed: ${JSON.stringify(statusJson).slice(0, 500)}`)
      }
    }
    throw new Error('[media] Kling video generation task timed out')
  }

  const dur = req.duration ?? 5

  const content: unknown[] = []
  if (isVolcArk) {
    const flags = `  --resolution 1080p  --duration ${dur} --camerafixed false --watermark false`
    content.push({ type: 'text', text: prompt + flags })
    if (req.imageUrls && req.imageUrls.length > 0) {
      for (const url of req.imageUrls) {
        content.push({ type: 'image_url', image_url: { url } })
      }
    } else if (req.imageUrl) {
      content.push({ type: 'image_url', image_url: { url: req.imageUrl } })
    }
  } else {
    content.push({ type: 'text', text: prompt })
  }

  const created = await postJSON(`${base}/contents/generations/tasks`, provider.apiKey, {
    model: effectiveModel,
    content,
    ...(isVolcArk ? {} : { 
      generate_audio: true, 
      ratio: req.ratio ?? '16:9', 
      duration: dur, 
      watermark: false,
      ...(req.imageUrls ? { image_list: req.imageUrls } : {})
    })
  })
  const taskId = pickTaskId(created)
  if (!taskId) throw new Error('[media] video task id not found')
  return pollTask(base, provider.apiKey, taskId, '.mp4', req.projectId)
}
