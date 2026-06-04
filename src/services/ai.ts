import type { ModelProvider } from '../types/project'
import { uid } from '../utils/uid'
import { toProviderConfig } from '../utils/provider'

// ===== Types =====

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionOptions {
  provider: ModelProvider
  model?: string
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}

export interface ChatCompletionResult {
  content: string
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
}

export interface StreamCallbacks {
  onToken?: (token: string) => void
  onDone?: (full: string) => void
  onError?: (err: Error) => void
}

// ===== Helpers =====

function getLumenApi() {
  return (window as unknown as { lumen?: { ai?: {
    chat: (req: unknown) => Promise<{ content: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }>
    chatStream: (req: unknown) => Promise<{ ok: boolean; error?: string }>
    cancelStream: (requestId: string) => Promise<{ ok: boolean }>
    onStreamToken: (cb: (data: { requestId: string; token: string }) => void) => () => void
    onStreamDone: (cb: (data: { requestId: string; content: string }) => void) => () => void
    onStreamError: (cb: (data: { requestId: string; error: string }) => void) => () => void
  } } }).lumen?.ai
}

// ===== Non-streaming chat =====

export async function chatCompletion(opts: ChatCompletionOptions): Promise<ChatCompletionResult> {
  const api = getLumenApi()

  // 优先走 IPC (API key 在主进程)
  if (api) {
    return api.chat({
      provider: toProviderConfig(opts.provider),
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature,
      maxTokens: opts.maxTokens
    })
  }

  // 降级: 直接 fetch (开发/浏览器环境)
  return chatCompletionFetch(opts)
}

// ===== Streaming chat =====

export async function chatCompletionStream(
  opts: ChatCompletionOptions,
  callbacks: StreamCallbacks
): Promise<void> {
  const api = getLumenApi()

  // 优先走 IPC 流
  if (api) {
    return chatCompletionStreamIPC(api, opts, callbacks)
  }

  // 降级: 直接 fetch stream
  return chatCompletionStreamFetch(opts, callbacks)
}

// ===== IPC streaming implementation =====

async function chatCompletionStreamIPC(
  api: NonNullable<ReturnType<typeof getLumenApi>>,
  opts: ChatCompletionOptions,
  callbacks: StreamCallbacks
): Promise<void> {
  const requestId = uid()

  return new Promise<void>((resolve, reject) => {
    const cleanups: Array<() => void> = []

    const cleanup = () => cleanups.forEach((fn) => fn())

    cleanups.push(api.onStreamToken((data) => {
      if (data.requestId === requestId) callbacks.onToken?.(data.token)
    }))

    cleanups.push(api.onStreamDone((data) => {
      if (data.requestId !== requestId) return
      cleanup()
      callbacks.onDone?.(data.content)
      resolve()
    }))

    cleanups.push(api.onStreamError((data) => {
      if (data.requestId !== requestId) return
      cleanup()
      const err = new Error(data.error)
      callbacks.onError?.(err)
      reject(err)
    }))

    // 处理 abort
    if (opts.signal) {
      opts.signal.addEventListener('abort', () => {
        api.cancelStream(requestId)
        cleanup()
        reject(new DOMException('Aborted', 'AbortError'))
      })
    }

    api.chatStream({
      requestId,
      provider: toProviderConfig(opts.provider),
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature,
      maxTokens: opts.maxTokens
    }).catch((err: unknown) => {
      cleanup()
      reject(err)
    })
  })
}

// ===== Fetch fallback implementations =====

async function chatCompletionFetch(opts: ChatCompletionOptions): Promise<ChatCompletionResult> {
  const { provider, messages, signal } = opts
  const model = opts.model || provider.defaultModel || provider.models[0] || 'gpt-4o'
  const temperature = opts.temperature ?? 0.7
  const maxTokens = opts.maxTokens ?? 4096

  const url = `${provider.baseUrl.replace(/\/$/, '')}/chat/completions`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${provider.apiKey}`,
    ...(provider.headers ?? {})
  }
  const body = JSON.stringify({ model, messages, temperature, max_tokens: maxTokens })

  const resp = await fetch(url, { method: 'POST', headers, body, signal })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`[AI] ${resp.status} ${resp.statusText}: ${text.slice(0, 200)}`)
  }

  const json = await resp.json()
  const choice = json.choices?.[0]
  if (!choice) throw new Error('[AI] No choices returned')

  return {
    content: choice.message?.content ?? '',
    usage: json.usage ? {
      promptTokens: json.usage.prompt_tokens ?? 0,
      completionTokens: json.usage.completion_tokens ?? 0,
      totalTokens: json.usage.total_tokens ?? 0
    } : undefined
  }
}

async function chatCompletionStreamFetch(
  opts: ChatCompletionOptions,
  callbacks: StreamCallbacks
): Promise<void> {
  const { provider, messages, signal } = opts
  const model = opts.model || provider.defaultModel || provider.models[0] || 'gpt-4o'
  const temperature = opts.temperature ?? 0.7
  const maxTokens = opts.maxTokens ?? 4096

  const url = `${provider.baseUrl.replace(/\/$/, '')}/chat/completions`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${provider.apiKey}`,
    ...(provider.headers ?? {})
  }
  const body = JSON.stringify({ model, messages, temperature, max_tokens: maxTokens, stream: true })

  const resp = await fetch(url, { method: 'POST', headers, body, signal })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    callbacks.onError?.(new Error(`[AI] ${resp.status}: ${text.slice(0, 200)}`))
    return
  }

  const reader = resp.body?.getReader()
  if (!reader) { callbacks.onError?.(new Error('[AI] No response body')); return }

  const decoder = new TextDecoder()
  let buf = ''
  let full = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') break
        try {
          const parsed = JSON.parse(data)
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) { full += delta; callbacks.onToken?.(delta) }
        } catch { /* skip */ }
      }
    }
    callbacks.onDone?.(full)
  } catch (err) {
    callbacks.onError?.(err instanceof Error ? err : new Error(String(err)))
  }
}

// ===== Visual Style Prompts Definition =====
export const VISUAL_STYLE_PROMPTS = {
  realistic: "Cinematic, photorealistic, 8k, movie still, shot on Arri Alexa, 35mm lens, realistic textures, natural volumetric lighting, depth of field, dramatic shadows, professional color grading, realistic skin and fabric details.",
  anime: "Anime style, gorgeous Japanese key visual, Kyoto Animation style, clean outlines, vibrant and soft colors, beautifully cel-shaded, detailed background scenery, expressive anime eyes, high quality, digital masterpiece.",
  ink: "Traditional Chinese ink wash painting, masterfully rendered ink strokes, watercolor texture, flowing dynamic brushwork, delicate color washes, poetic atmospheric mist, artistic negative space, traditional artistic aesthetic.",
  cyberpunk: "Cyberpunk aesthetic, neon-drenched scene, high-contrast synthwave color palette, rain-slicked streets with glowing reflections, dense urban background, high-tech holographic displays, volumetric fog, dramatic sci-fi lighting, movie still.",
  custom: ""
}

// ===== Prompt templates =====

export const PROMPTS = {
  generateWorldBuilding: (theme: string, genre: string, extraInstructions: string) => [
    {
      role: 'system' as const,
      content: `你是一位资深编剧，请用中文回答。`
    },
    {
      role: 'user' as const,
      content: `主题: ${theme}
题材: ${genre}
${extraInstructions ? `额外要求: ${extraInstructions}` : ''}

请返回 JSON:
{
  "synopsis": "故事梗概 (核心剧情发展线)",
  "characters": [
    {
      "name": "姓名",
      "age": "年龄",
      "gender": "male|female|neutral|unknown",
      "identity": "身份/职业",
      "appearance": "详细外貌 (体型、发型、面容 — 用于生图一致性)",
      "outfit": "默认穿着",
      "personality": "性格/口头禅",
      "background": "经历与动机"
    }
  ],
  "stylesAndPacing": "风格与节奏 (文风、叙事视角、镜头风格、剧情节奏、禁止词)"
}
只输出 JSON。`
    }
  ],

  generateOutline: (theme: string, style: string, worldBuildingContext: string, extraInstructions: string) => [
    {
      role: 'system' as const,
      content: `你是一位资深编剧，擅长构建故事发展路线。大纲是故事的"故事点"序列, 每个故事点是一个叙事节点 (如西游记的81难), 不限制集数或时长。请用中文回答。`
    },
    {
      role: 'user' as const,
      content: `请根据以下要求创建故事大纲 (故事点序列):
主题: ${theme}
风格: ${style}
${worldBuildingContext ? `世界观设定:\n${worldBuildingContext}` : ''}
${extraInstructions ? `额外要求: ${extraInstructions}` : ''}

请按以下 JSON 格式输出:
[
  { "title": "故事点标题", "summary": "剧情摘要", "goal": "本故事点叙事目标" },
  ...
]
只输出 JSON 数组，不要其他内容。故事点数量由故事发展决定，不要硬性限制。`
    }
  ],

  generateChapter: (opts: {
    storyPoint: string
    storyPointGoal: string
    chapterLabel: string
    worldBuildingContext: string
    recentSummaries: string
    characterStates: string
    currentTask: string
    chapterGoal: string
    extraInstructions: string
  }) => [
    {
      role: 'system' as const,
      content: `你是一位短剧编剧，擅长将大纲故事点展开为完整的章节故事。请用中文回答。
故事应当包含生动的场景描述、角色行动、对白。
你必须严格遵守世界观设定和创作规则。`
    },
    {
      role: 'user' as const,
      content: `当前故事点: ${opts.storyPoint}
故事点目标: ${opts.storyPointGoal}
当前要写章节: ${opts.chapterLabel}
${opts.chapterGoal ? `本章目标: ${opts.chapterGoal}` : ''}
${opts.currentTask ? `当前任务: ${opts.currentTask}` : ''}

${opts.worldBuildingContext ? `=== 世界观设定 (固定提示词) ===\n${opts.worldBuildingContext}` : ''}

${opts.recentSummaries ? `=== 最近章节摘要 ===\n${opts.recentSummaries}` : ''}

${opts.characterStates ? `=== 角色当前状态 ===\n${opts.characterStates}` : ''}

${opts.extraInstructions ? `额外要求: ${opts.extraInstructions}` : ''}

请写一段完整的故事内容 (500-1500字)，包含:
- 场景描述
- 角色行动与对白
- 情感节奏变化

只输出故事正文。`
    }
  ],

  splitToShots: (chapterContent: string, extraInstructions: string, style?: string) => [
    {
      role: 'system' as const,
      content: `你是一位顶级分镜师和 AI 生图提示词专家，擅长将文字剧本拆解为高表现力的视频镜头，并为每个镜头撰写极具电影感和画面信息密度的生图提示词。`
    },
    {
      role: 'user' as const,
      content: `请将以下章节内容拆分为分镜镜头:

${chapterContent}

${extraInstructions ? `额外要求: ${extraInstructions}` : ''}
${style && VISUAL_STYLE_PROMPTS[style as keyof typeof VISUAL_STYLE_PROMPTS] ? `\n【重要：画面风格必须严格统一为：${style} 风格】\n统一风格基调和画面渲染特征定义：\n${VISUAL_STYLE_PROMPTS[style as keyof typeof VISUAL_STYLE_PROMPTS]}` : ''}

对于每个镜头的 "visualPrompt"（画面生图描述，英文），你必须使用【极致详细通用结构】来构建，以实现极高的画面信息密度。
提示词结构公式：
【Subject Identity 主体身份 & Age/Gender】+【Appearance & Face/Hair details 外貌】+【Emotion/Mood 情绪状态】+【Pose/Action 具体动作姿态】+【Costume & Materials 服饰材质】+【Environment/Scene 场景环境细节】+【Time/Weather 时间天气】+【Lighting & Source/Direction 光线光影】+【Camera & Angle/Composition 镜头构图机位】+【Colors/Color Palette 色彩调性】+【Dynamic Elements 动态元素】+【Atmosphere 氛围感】+【Style & Quality words 电影感写实风格与画质词】

例如：
"At morning golden backlighting, a 18-year-old young taoist priest slightly turns sideways, looking up at the sky, wind blowing through grey cotton robe and loose strands of black hair, rusted vermilion temple wooden doors enveloped in morning mist, golden dust particles floating in air. Cinematic lighting, shallow depth of field, 85mm lens, masterpiece, photorealistic, 8k, movie still."

请按以下 JSON 格式输出:
[
  {
    "scene": "场景名",
    "characters": ["角色A", "角色B"],
    "action": "动作/事件描述",
    "dialogue": "对白 (无对白留空)",
    "camera": "wide|medium|close-up|over-shoulder|pov|aerial|tracking",
    "visualPrompt": "基于上述高级结构生成的极致电影感、高信息密度的英文生图提示词",
    "duration": 3
  },
  ...
]
只输出 JSON 数组，不要其他内容。`
    }
  ],

  generateVisualPrompt: (
    shot: { 
      scene: string; 
      sceneDescription?: string; 
      characters: string[]; 
      characterProfiles?: Array<{ name: string; appearance?: string; outfit?: string }>; 
      action: string; 
      dialogue: string; 
      camera: string 
    }, 
    style?: string
  ) => [
    {
      role: 'system' as const,
      content: `你是一位世界顶级的 AI 绘画提示词专家。你深谙电影摄影学、光影美学、构图以及色彩心理学。你的任务是根据镜头信息，生成一段英文画面描述 (visual prompt)，用于 AI 图像生成模型。`
    },
    {
      role: 'user' as const,
      content: `请根据以下镜头信息和关联的默认人设/场景资产特征描述，生成一段极致电影感、高信息密度的英文生图提示词 (visual prompt):
镜头信息与资产特征:
- 场景: ${shot.scene}${shot.sceneDescription ? ` (场景默认设定: ${shot.sceneDescription})` : ''}
- 角色: ${shot.characters.map((name) => {
    const profile = shot.characterProfiles?.find(p => p.name === name)
    if (profile) {
      return `${name}${profile.appearance ? ` [外貌特征: ${profile.appearance}]` : ''}${profile.outfit ? ` [服饰装扮: ${profile.outfit}]` : ''}`
    }
    return name
  }).join(', ') || '无'}
- 动作: ${shot.action}
- 对白: ${shot.dialogue || '无'}
- 镜头: ${shot.camera}

${style && VISUAL_STYLE_PROMPTS[style as keyof typeof VISUAL_STYLE_PROMPTS] ? `\n【重要：画面风格必须严格统一为：${style} 风格】\n统一风格基调和画面渲染特征定义：\n${VISUAL_STYLE_PROMPTS[style as keyof typeof VISUAL_STYLE_PROMPTS]}` : ''}

【极重要：生成提示词时，必须严格、完整地将上述对应角色的“外貌特征”、“服饰装扮”默认设定以及场景的“默认设定”翻译成英文并融合到画面细节中，以维持角色和场景在整个系列中的极高画风一致性！】

你必须使用【极致详细通用结构】来撰写，不要使用苍白的词汇堆砌，而是构建画面层层细节，让 AI 能够理解光影、镜头、情绪和电影语言。
提示词结构公式：
【Subject Identity 主体身份 & Age/Gender】+【Appearance & Face/Hair details 外貌细节】+【Emotion/Mood 情绪状态】+【Pose/Action 具体动作姿态】+【Costume & Materials 服饰材质】+【Environment/Scene 场景环境细节】+【Time/Weather 时间天气】+【Lighting & Source/Direction 光线光影】+【Camera & Angle/Composition 镜头构图机位】+【Colors/Color Palette 色彩调性】+【Dynamic Elements 动态元素】+【Atmosphere 氛围感】+【Style & Quality words 电影感写实风格与画质词】

提示词示例：
"At morning golden backlighting, a 18-year-old young taoist priest slightly turns sideways, looking up at the sky, wind blowing through grey cotton robe and loose strands of black hair, rusted vermilion temple wooden doors enveloped in morning mist, golden dust particles floating in air. Cinematic lighting, shallow depth of field, 85mm lens, masterpiece, photorealistic, 8k, movie still."

请直接输出英文 visual prompt (约150-250词)，不要添加任何标签、前缀或解释。`
    }
  ],
}

// ===== Robust JSON Parsing Utilities =====

export function safeJsonParse<T = any>(str: string): T {
  let cleaned = str.trim()
  
  // 1. Remove markdown code blocks if present
  if (cleaned.includes('```')) {
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (match && match[1]) {
      cleaned = match[1].trim()
    } else {
      cleaned = cleaned.replace(/```json\n?|```/g, '').trim()
    }
  }

  // 2. Try standard parsing
  try {
    return JSON.parse(cleaned)
  } catch (e) {
    // Continue to repair
  }

  // 3. Extract outermost JSON structure
  const firstBrace = cleaned.indexOf('{')
  const firstBracket = cleaned.indexOf('[')
  let startIdx = -1
  let endIdx = -1

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace
    endIdx = cleaned.lastIndexOf('}')
  } else if (firstBracket !== -1) {
    startIdx = firstBracket
    endIdx = cleaned.lastIndexOf(']')
  }

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1)
  }

  // 4. Try parsing extracted substring
  try {
    return JSON.parse(cleaned)
  } catch (e) {
    // Continue to repair
  }

  // 5. Repair raw newlines inside JSON string properties
  try {
    let repaired = ''
    let inString = false
    let escaped = false
    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i]
      if (char === '\\' && !escaped) {
        escaped = true
        repaired += char
      } else if (char === '"' && !escaped) {
        inString = !inString
        repaired += char
      } else if ((char === '\n' || char === '\r') && inString) {
        repaired += '\\n'
      } else {
        escaped = false
        repaired += char
      }
    }
    return JSON.parse(repaired)
  } catch (e) {
    // 6. Last resort: close any unclosed structures (unclosed string or brackets/braces)
    try {
      return relaxedParse(cleaned)
    } catch (finalError) {
      throw new Error(`JSON 解析失败: ${(finalError as Error).message}\n原始文本: ${str.slice(0, 300)}...`)
    }
  }
}

function relaxedParse(str: string): any {
  let openBraces = 0
  let openBrackets = 0
  let inString = false
  let escaped = false
  let cleanStr = ''

  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    if (char === '\\' && !escaped) {
      escaped = true
      cleanStr += char
      continue
    }
    if (char === '"' && !escaped) {
      inString = !inString
    }
    if (!inString) {
      if (char === '{') openBraces++
      if (char === '}') openBraces--
      if (char === '[') openBrackets++
      if (char === ']') openBrackets--
    }
    escaped = false
    cleanStr += char
  }

  if (inString) {
    cleanStr += '"'
  }
  while (openBraces > 0) {
    cleanStr += '}'
    openBraces--
  }
  while (openBrackets > 0) {
    cleanStr += ']'
    openBrackets--
  }

  return JSON.parse(cleanStr)
}
