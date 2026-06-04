import { useEffect } from 'react'
import { useGenerate } from '../store/generate'
import { useProject } from '../store/project'
import { generateMedia } from '../services/media'
import { VISUAL_STYLE_PROMPTS } from '../services/ai'
import { withTimeout } from '../utils/withTimeout'

export function GenerateRunner() {
  const { tasks, runningId, setRunning, updateTask } = useGenerate()
  const { id: projectId, shots, providers, updateShot, visualStyle } = useProject()

  useEffect(() => {
    if (runningId) return
    const nextTask = tasks.find((t) => t.status === 'queued')
    if (!nextTask) return
    const task = nextTask

    async function run() {
      setRunning(task.id)
      updateTask(task.id, { status: 'running', progress: 5 })
      try {
        // Cooldown delay (1.5 seconds) to respect free-tier RPM rate limits and avoid Cloudflare tarpitting/stalls
        await new Promise((resolve) => setTimeout(resolve, 1500))

        const shot = shots.find((s) => s.id === task.shotId)
        if (!shot) throw new Error('镜头不存在')

        if (task.type === 'image') {
          const provider = task.providerId
            ? providers.find((p) => p.id === task.providerId)
            : providers.find((p) => p.kind === 'image' && p.enabled)
          if (!provider) throw new Error('未配置图像模型')
          let prompt = shot.visualPrompt || [shot.scene, shot.action, shot.dialogue].filter(Boolean).join('\n')
          if (!prompt) throw new Error('镜头缺少画面描述')
          
          // Inject unified visual style prompt to ensure style consistency
          const stylePrompt = visualStyle && VISUAL_STYLE_PROMPTS[visualStyle as keyof typeof VISUAL_STYLE_PROMPTS]
          if (stylePrompt && !prompt.toLowerCase().includes(stylePrompt.toLowerCase().slice(0, 20))) {
            prompt = `${prompt}, ${stylePrompt}`
          }

          updateTask(task.id, { progress: 20 })
          const result = await withTimeout(
            generateMedia({ provider, prompt, kind: 'image', shotId: shot.id, projectId, ratio: '16:9' }),
            90000,
            '图像生成响应超时 (90秒)，可能是第三方 API 服务器繁忙，请尝试重新生成该卡片'
          )
          updateShot(shot.id, { imagePath: `lumen-media:///${result.path.replace(/\\/g, '/')}`, imageRemoteUrl: result.url })
          updateTask(task.id, { status: 'done', progress: 100, result: result.path })
          return
        }

        if (task.type === 'video') {
          const provider = task.providerId
            ? providers.find((p) => p.id === task.providerId)
            : providers.find((p) => p.kind === 'video' && p.enabled)
          if (!provider) throw new Error('未配置视频模型')
          const prompt = [shot.visualPrompt, shot.action, shot.dialogue].filter(Boolean).join('\n')
          if (!prompt) throw new Error('镜头缺少视频描述')
          
          const imageUrls: string[] = []
          if (shot.imageRemoteUrl) {
            imageUrls.push(shot.imageRemoteUrl)
          }
          const nextShot = shots.find((s) => s.chapterId === shot.chapterId && s.index === shot.index + 1)
          if (nextShot?.imageRemoteUrl) {
            imageUrls.push(nextShot.imageRemoteUrl)
          }

          updateTask(task.id, { progress: 15 })
          const result = await withTimeout(
            generateMedia({ 
              provider, 
              prompt, 
              kind: 'video', 
              shotId: shot.id, 
              projectId,
              ratio: '16:9', 
              duration: shot.duration, 
              imageUrl: shot.imageRemoteUrl || undefined,
              imageUrls: imageUrls.length > 0 ? imageUrls : undefined
            }),
            300000,
            '视频生成任务轮询超时 (300秒)，请重试或在后台查看视频渲染状态'
          )
          updateShot(shot.id, { videoPath: `lumen-media:///${result.path.replace(/\\/g, '/')}` })
          updateTask(task.id, { status: 'done', progress: 100, result: result.path })
          return
        }

        updateTask(task.id, { status: 'done', progress: 100 })
      } catch (err) {
        updateTask(task.id, {
          status: 'error',
          progress: 100,
          error: err instanceof Error ? err.message : String(err)
        })
      } finally {
        setRunning(null)
      }
    }

    run()
  }, [tasks, runningId, setRunning, updateTask, shots, providers, updateShot, visualStyle])

  return null
}
