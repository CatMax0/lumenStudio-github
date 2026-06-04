const fs = require('node:fs')
const path = require('node:path')

function loadEnv(file) {
  const env = {}
  if (!fs.existsSync(file)) return env
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const i = trimmed.indexOf('=')
    if (i < 0) continue
    env[trimmed.slice(0, i)] = trimmed.slice(i + 1)
  }
  return env
}

function cleanJsonText(text) {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()
}

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

async function chat({ apiKey, baseUrl, model, messages, temperature = 0.7, maxTokens = 4096 }) {
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens })
  })
  const text = await resp.text()
  if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}: ${text.slice(0, 800)}`)
  const json = JSON.parse(text)
  const content = json.choices?.[0]?.message?.content ?? ''
  return { content, usage: json.usage }
}

function outlinePrompt(theme, style, episodes, extraInstructions) {
  return [
    { role: 'system', content: '你是一位资深编剧，擅长构建悬念感强的短剧大纲。请用中文回答。' },
    { role: 'user', content: `请根据以下要求创建一个短剧大纲:\n主题: ${theme}\n风格: ${style}\n集数: ${episodes}\n${extraInstructions ? `额外要求: ${extraInstructions}` : ''}\n\n请按以下 JSON 格式输出:\n[\n  { "title": "第一幕标题", "summary": "剧情摘要" }\n]\n只输出 JSON 数组，不要其他内容。` }
  ]
}

function chapterPrompt(outline, chapterIndex, existingChapters, extraInstructions) {
  return [
    { role: 'system', content: '你是一位短剧编剧，擅长将大纲展开为完整的章节故事。请用中文回答。故事应当包含生动的场景描述、角色行动、对白。' },
    { role: 'user', content: `大纲:\n${outline}\n\n当前要写第 ${chapterIndex + 1} 章。\n${existingChapters ? `已有章节内容:\n${existingChapters}` : ''}\n${extraInstructions ? `额外要求: ${extraInstructions}` : ''}\n\n请为第 ${chapterIndex + 1} 章写一段完整的故事内容 (500-1000字)，包含:\n- 场景描述\n- 角色行动与对白\n- 情感节奏变化\n\n只输出故事正文。` }
  ]
}

function shotsPrompt(chapterContent, extraInstructions) {
  return [
    { role: 'system', content: '你是一位分镜师，擅长将文字剧本拆解为可执行的视频镜头。请用中文回答。' },
    { role: 'user', content: `请将以下章节内容拆分为分镜镜头:\n\n${chapterContent}\n\n${extraInstructions ? `额外要求: ${extraInstructions}` : ''}\n\n请按以下 JSON 格式输出:\n[\n  {\n    "scene": "场景名",\n    "characters": ["角色A", "角色B"],\n    "action": "动作/事件描述",\n    "dialogue": "对白 (无对白留空)",\n    "camera": "wide|medium|close-up|over-shoulder|pov|aerial|tracking",\n    "visualPrompt": "画面生图描述 (英文关键词风格)",\n    "duration": 3\n  }\n]\n只输出 JSON 数组，不要其他内容。` }
  ]
}

async function main() {
  const root = path.resolve(__dirname, '..')
  const env = { ...process.env, ...loadEnv(path.join(root, '.env')) }
  const apiKey = env.VOLC_API_KEY || env.ARK_API_KEY
  if (!apiKey) throw new Error('Missing VOLC_API_KEY or ARK_API_KEY in .env')

  const baseUrl = env.VOLC_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3'
  const model = env.VOLC_LLM_MODEL || 'doubao-seed-2-0-pro-260215'
  const theme = env.LUMEN_TEST_THEME || '都市玄学短剧：落魄女主意外继承一间旧茶馆，发现茶馆地下藏着能改命的六爻秘册，却被资本集团和神秘道门同时盯上。'
  const genre = env.LUMEN_TEST_GENRE || '都市悬疑 / 玄学 / 爽剧'
  const pace = env.LUMEN_TEST_PACE || '快节奏，每章结尾有强钩子'

  console.log('[1/3] 豆包生成大纲...')
  const outlineRes = await chat({
    apiKey,
    baseUrl,
    model,
    messages: outlinePrompt(theme, `${genre} / ${pace} / 3分钟/集`, '6集', '四幕结构，第一章必须有强冲突和反转'),
    temperature: 0.8,
    maxTokens: 2048
  })
  const acts = JSON.parse(cleanJsonText(outlineRes.content))
  console.log(`      大纲完成: ${acts.length} 幕`)

  const outlineText = acts.map((a) => `${a.title}: ${a.summary}`).join('\n')
  console.log('[2/3] 豆包生成第一章...')
  const chapterRes = await chat({
    apiKey,
    baseUrl,
    model,
    messages: chapterPrompt(outlineText, 0, '', '第一章控制在 800 字以内，突出短剧感、强冲突、清晰场景和对白。'),
    temperature: 0.8,
    maxTokens: 4096
  })
  const chapterText = chapterRes.content.trim()
  console.log(`      第一章完成: ${chapterText.length} 字`)

  console.log('[3/3] 豆包拆分第一章分镜...')
  const shotsRes = await chat({
    apiKey,
    baseUrl,
    model,
    messages: shotsPrompt(chapterText, '拆成 8-12 个镜头。visualPrompt 必须是英文，适合 AI 生图。duration 为 2-5 秒。'),
    temperature: 0.55,
    maxTokens: 8192
  })
  const rawShots = JSON.parse(cleanJsonText(shotsRes.content))
  const allowedCameras = new Set(['wide', 'medium', 'close-up', 'over-shoulder', 'pov', 'aerial', 'tracking'])
  const chapterId = uid('ch')
  const shots = rawShots.map((s, i) => ({
    id: uid('shot'),
    chapterId,
    index: i + 1,
    scene: String(s.scene || ''),
    characters: Array.isArray(s.characters) ? s.characters.map(String) : [],
    action: String(s.action || ''),
    dialogue: String(s.dialogue || ''),
    camera: allowedCameras.has(s.camera) ? s.camera : 'medium',
    visualPrompt: String(s.visualPrompt || ''),
    duration: Number(s.duration) || 3
  }))
  console.log(`      分镜完成: ${shots.length} 个镜头`)

  const result = {
    generatedAt: new Date().toISOString(),
    provider: {
      name: '豆包 Doubao (火山方舟)',
      kind: 'llm',
      baseUrl,
      model
    },
    project: {
      name: '豆包全流程验证项目',
      theme,
      genre,
      pace,
      acts: acts.map((a) => ({ id: uid('act'), title: String(a.title || ''), summary: String(a.summary || '') })),
      chapters: [{ id: chapterId, title: '第一章', synopsis: chapterText, scenes: [], assetRefs: [] }],
      shots,
      assets: [],
      providers: [
        {
          id: uid('provider'),
          kind: 'llm',
          name: '豆包 Doubao (火山方舟)',
          baseUrl,
          apiKey: apiKey.replace(/.(?=.{6})/g, '*'),
          models: [model],
          defaultModel: model,
          enabled: true
        }
      ]
    },
    usage: {
      outline: outlineRes.usage,
      chapter: chapterRes.usage,
      shots: shotsRes.usage
    }
  }

  const outDir = path.join(root, 'out')
  fs.mkdirSync(outDir, { recursive: true })
  const outFile = path.join(outDir, 'doubao-flow-result.json')
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2), 'utf8')
  console.log(`[done] 已保存: ${outFile}`)
  console.log(`       acts=${result.project.acts.length}, chapters=${result.project.chapters.length}, shots=${result.project.shots.length}`)
}

main().catch((err) => {
  console.error('[failed]', err.message)
  process.exit(1)
})
