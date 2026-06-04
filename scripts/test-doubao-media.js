/**
 * 测试豆包图像 + 视频生成（模拟 electron/services/ai/media.ts 逻辑）
 */
const fs = require('node:fs')
const path = require('node:path')

function loadEnv() {
  const env = {}
  const file = path.join(__dirname, '..', '.env')
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

const env = loadEnv()
const API_KEY = env.VOLC_API_KEY
const BASE = 'https://ark.cn-beijing.volces.com/api/v3'

async function postJSON(url, body) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify(body)
  })
  const text = await resp.text()
  if (!resp.ok) throw new Error(`${resp.status}: ${text.slice(0, 500)}`)
  return JSON.parse(text)
}

async function getJSON(url) {
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${API_KEY}` } })
  const text = await resp.text()
  if (!resp.ok) throw new Error(`${resp.status}: ${text.slice(0, 500)}`)
  return JSON.parse(text)
}

async function saveRemote(url, ext) {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`download failed ${resp.status}`)
  const buf = Buffer.from(await resp.arrayBuffer())
  const dir = path.join(__dirname, '..', 'test-output')
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`)
  fs.writeFileSync(file, buf)
  return file
}

// ========== 测试图像生成 ==========
async function testImage() {
  console.log('\n🖼️ [图像] 开始测试 doubao-seedream-5-0-260128 ...')
  const prompt = '一位穿着中式旗袍的女子站在雨中的古镇石板路上，撑着油纸伞，背景是朦胧的青瓦白墙，电影画面，暗调，浅景深'
  const json = await postJSON(`${BASE}/images/generations`, {
    model: 'doubao-seedream-5-0-260128',
    prompt,
    sequential_image_generation: 'disabled',
    size: '2K',
    stream: false,
    watermark: true,
    response_format: 'url'
  })
  const url = json.data?.[0]?.url
  if (!url) {
    console.error('❌ [图像] 未获得 url，响应:', JSON.stringify(json).slice(0, 500))
    return null
  }
  console.log('✅ [图像] 生成成功，开始下载...')
  const file = await saveRemote(url, '.jpg')
  console.log(`✅ [图像] 已保存: ${file}`)
  return file
}

// ========== 测试视频生成 ==========
async function testVideo() {
  console.log('\n🎬 [视频] 开始测试 doubao-seedance-1-0-pro-fast-251015 (图生视频) ...')
  const prompt = '一位穿着旗袍的女子在雨中古镇缓缓走过石板路，油纸伞微微倾斜，雨滴溅起水花，电影质感  --resolution 1080p  --duration 5 --camerafixed false --watermark false'
  const imgUrl = 'https://ark-project.tos-cn-beijing.volces.com/doc_image/seepro_i2v.png'
  const created = await postJSON(`${BASE}/contents/generations/tasks`, {
    model: 'doubao-seedance-1-0-pro-fast-251015',
    content: [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: imgUrl } }
    ]
  })
  const taskId = created.id || created.task_id || created.data?.id || created.data?.task_id
  if (!taskId) {
    console.error('❌ [视频] 未获得 task_id，响应:', JSON.stringify(created).slice(0, 500))
    return null
  }
  console.log(`⏳ [视频] task_id = ${taskId}，开始轮询...`)

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000))
    const status = await getJSON(`${BASE}/contents/generations/tasks/${taskId}`)
    const st = String(status.status || status.data?.status || '').toLowerCase()
    console.log(`   [视频] 第${i + 1}次轮询, status = ${st}`)

    // 获取 url
    const url = status.data?.[0]?.url || status.content?.video_url || status.result?.url
    if (url && ['succeeded', 'success', 'completed', 'done'].some((s) => st.includes(s))) {
      console.log('✅ [视频] 生成成功，开始下载...')
      const file = await saveRemote(url, '.mp4')
      console.log(`✅ [视频] 已保存: ${file}`)
      return file
    }
    if (['failed', 'error', 'cancelled'].some((s) => st.includes(s))) {
      console.error('❌ [视频] 任务失败:', JSON.stringify(status).slice(0, 500))
      return null
    }
  }
  console.error('❌ [视频] 超时')
  return null
}

// ========== 主函数 ==========
async function main() {
  console.log('=== 豆包媒体生成测试 ===')
  console.log(`API_KEY: ${API_KEY?.slice(0, 12)}...`)

  const imgFile = await testImage()
  const vidFile = await testVideo()

  console.log('\n=== 测试结果 ===')
  console.log(`图像: ${imgFile ?? '失败'}`)
  console.log(`视频: ${vidFile ?? '失败'}`)
}

main().catch((e) => {
  console.error('致命错误:', e)
  process.exit(1)
})
