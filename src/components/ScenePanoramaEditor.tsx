import { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useProject } from '../store/project'
import { generateMedia } from '../services/media'
import type { AssetItem } from '../types/project'

const isElectron = !!(window as unknown as { lumen?: unknown }).lumen

function toMediaSrc(path: string | undefined): string {
  if (!path) return ''
  if (isElectron) return path.replace(/^file:\/\/\//, 'lumen-media:///')
  const name = path.replace(/\\/g, '/').split('/').pop() || ''
  return `/media/${name}`
}

interface ScenePanoramaEditorProps {
  asset: AssetItem
  onBack: () => void
}

export function ScenePanoramaEditor({ asset, onBack }: ScenePanoramaEditorProps) {
  const { providers, updateAsset } = useProject()
  const [name, setName] = useState(asset.name || '')
  const [description, setDescription] = useState(asset.description || '')
  const [generating, setGenerating] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d') // '3d' | '2d' modes to toggle between spherical look-around and flat preview
  
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const imageProvider = providers.find((p) => p.kind === 'image' && p.enabled)

  // Save changes to store
  const handleSaveMeta = () => {
    updateAsset(asset.id, { name, description })
  }

  // Handle importing local file
  const handleImportPanorama = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // In Electron, file.path is the actual absolute local file path
    const localPath = (file as any).path || ""
    if (localPath) {
      const formattedPath = `lumen-media:///${localPath.replace(/\\/g, '/')}`
      updateAsset(asset.id, { panoramaPath: formattedPath })
    } else {
      // Browser fallback using object URL
      const fallbackUrl = URL.createObjectURL(file)
      updateAsset(asset.id, { panoramaPath: fallbackUrl })
    }
  }

  // Handle generating panorama
  const handleGeneratePanorama = async () => {
    if (!imageProvider || generating) return
    setGenerating(true)
    setErrorMsg('')
    try {
      const basePrompt = description || name || 'A beautiful cinematic environment'
      const panoramaPrompt = `Equirectangular projection panorama, 360-degree, seamless wrap, wide-angle 3D sphere, look around, ${basePrompt}, highly detailed, cinematic style, masterpiece, 8k resolution`
      
      const result = await generateMedia({
        provider: imageProvider,
        prompt: panoramaPrompt,
        kind: 'image',
        ratio: '2:1' // 2:1 is the golden standard ratio for equirectangular 360 panoramas
      })

      const path = `lumen-media:///${result.path.replace(/\\/g, '/')}`
      updateAsset(asset.id, { 
        name, 
        description, 
        panoramaPath: path 
      })
    } catch (err: unknown) {
      console.error('[ScenePanoramaEditor] generation failed:', err)
      setErrorMsg(err instanceof Error ? err.message : '生成失败')
    } finally {
      setGenerating(false)
    }
  }

  // Set up Three.js scene
  useEffect(() => {
    if (!containerRef.current || !asset.panoramaPath || viewMode !== '3d') return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // 1. Scene & Camera
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 1100) // 60 FOV is the gold standard for natural human-eye VR perspective
    const cameraTarget = new THREE.Vector3(0, 0, 0)

    // 2. Texture & perfect Equirectangular background projection
    const textureLoader = new THREE.TextureLoader()
    const src = toMediaSrc(asset.panoramaPath)
    
    const texture = textureLoader.load(src, (tex) => {
      tex.mapping = THREE.EquirectangularReflectionMapping // Maps directly to spherical background with zero polar constriction!
      tex.colorSpace = THREE.SRGBColorSpace
      scene.background = tex
    }, undefined, (err) => {
      console.error('Failed to load panorama texture:', err)
    })

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(width, height)
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // 4. Interactive look-around states
    let isUserInteracting = false
    let onPointerDownMouseX = 0
    let onPointerDownMouseY = 0
    let onPointerDownLon = 0
    let onPointerDownLat = 0
    let lon = 0
    let lat = 0
    let phi = 0
    let theta = 0

    // Adjust camera position & initial target
    camera.position.set(0, 0, 0)

    const handlePointerDown = (event: PointerEvent) => {
      if (event.isPrimary === false) return
      isUserInteracting = true
      onPointerDownMouseX = event.clientX
      onPointerDownMouseY = event.clientY
      onPointerDownLon = lon
      onPointerDownLat = lat
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.isPrimary === false) return
      if (isUserInteracting === true) {
        lon = (onPointerDownMouseX - event.clientX) * 0.1 + onPointerDownLon
        lat = (event.clientY - onPointerDownMouseY) * 0.1 + onPointerDownLat
      }
    }

    const handlePointerUp = () => {
      isUserInteracting = false
    }

    const handleWheel = (event: WheelEvent) => {
      const fov = camera.fov + event.deltaY * 0.05
      camera.fov = THREE.MathUtils.clamp(fov, 10, 100)
      camera.updateProjectionMatrix()
    }

    // Bind event listeners
    container.addEventListener('pointerdown', handlePointerDown)
    container.addEventListener('pointermove', handlePointerMove)
    container.addEventListener('pointerup', handlePointerUp)
    container.addEventListener('wheel', handleWheel)

    // Window resizing handler
    const handleResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    // 5. Render Loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate)

      // Clamp latitude to avoid camera flipping over poles
      lat = Math.max(-85, Math.min(85, lat))
      phi = THREE.MathUtils.degToRad(90 - lat)
      theta = THREE.MathUtils.degToRad(lon)

      cameraTarget.x = 500 * Math.sin(phi) * Math.cos(theta)
      cameraTarget.y = 500 * Math.cos(phi)
      cameraTarget.z = 500 * Math.sin(phi) * Math.sin(theta)

      camera.lookAt(cameraTarget)
      renderer.render(scene, camera)
    }
    animate()

    // 6. Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      container.removeEventListener('pointerdown', handlePointerDown)
      container.removeEventListener('pointermove', handlePointerMove)
      container.removeEventListener('pointerup', handlePointerUp)
      container.removeEventListener('wheel', handleWheel)

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      texture.dispose()
      renderer.dispose()
    }
  }, [asset.panoramaPath, viewMode])

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-panel">
      {/* 头部导航 */}
      <div className="h-10 shrink-0 border-b border-line px-4 flex items-center justify-between bg-panel-raised">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-xs text-ink-dim hover:text-ink transition-colors flex items-center gap-1"
          >
            ← 返回列表
          </button>
          <div className="h-4 w-px bg-line" />
          <span className="text-xs font-bold text-ink">🎬 场景全景交互编辑器 - {asset.name}</span>
          {asset.panoramaPath && (
            <div className="flex items-center bg-panel-deep border border-line rounded-sm overflow-hidden h-6 ml-4">
              <button
                onClick={() => setViewMode('3d')}
                className={`px-3 text-[10px] h-full transition-colors ${viewMode === '3d' ? 'bg-accent text-white font-semibold' : 'text-ink-dim hover:bg-panel-hover'}`}
              >
                3D 交互实景 VR
              </button>
              <button
                onClick={() => setViewMode('2d')}
                className={`px-3 text-[10px] h-full transition-colors ${viewMode === '2d' ? 'bg-accent text-white font-semibold' : 'text-ink-dim hover:bg-panel-hover'}`}
              >
                2D 平面展开图
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSaveMeta}
            className="h-7 px-3 bg-panel-deep border border-line text-xs text-ink hover:bg-panel-hover rounded-sm transition-colors"
          >
            保存元数据
          </button>
          <button
            onClick={handleGeneratePanorama}
            disabled={generating || !imageProvider}
            className="h-7 px-3 bg-accent text-white text-xs hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-sm transition-colors flex items-center gap-1 font-medium"
          >
            {generating ? '生成全景中...' : '✨ 生成 720° 全景图'}
          </button>
        </div>
      </div>

      {/* 主视图分区 */}
      <div className="flex-1 flex min-h-0">
        {/* 左侧：全景展示画布 */}
        <div className="flex-1 flex flex-col bg-black/40 relative">
          {asset.panoramaPath ? (
            viewMode === '3d' ? (
              <div 
                ref={containerRef} 
                className="w-full h-full cursor-grab active:cursor-grabbing relative overflow-hidden"
                style={{ touchAction: 'none' }}
              />
            ) : (
              <div className="w-full h-full overflow-auto p-4 flex items-center justify-center">
                <div className="max-w-4xl border border-line shadow-lg bg-panel-deep p-2 rounded-sm">
                  <img 
                    src={toMediaSrc(asset.panoramaPath)} 
                    className="w-full h-auto object-contain max-h-[70vh]" 
                    alt="2D 平面展开全景图"
                  />
                  <div className="text-center text-[10px] text-ink-dim mt-2 font-mono">
                    球形等距柱状投影 (Equirectangular Map) · 2:1 平面图比例
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-ink-dim">
              <div className="w-16 h-16 rounded-full bg-panel-deep border border-dashed border-line flex items-center justify-center text-xl mb-3 text-ink-mute">
                🌐
              </div>
              <p className="text-sm font-semibold mb-1">尚未生成 720° 全景图</p>
              <p className="text-xs mb-4 max-w-sm text-ink-dim">
                生成后，您可以直接在 3D 画布中拖拽旋转鼠标，身临其境地探索当前场景空间！
              </p>
              <button
                onClick={handleGeneratePanorama}
                disabled={generating || !imageProvider}
                className="h-8 px-4 bg-accent text-white text-xs hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-sm transition-colors font-medium flex items-center gap-1.5"
              >
                {generating ? '全自动渲染中...' : '✨ 立即全自动生成全景图'}
              </button>
            </div>
          )}

          {/* 生成中的加载状态遮罩 */}
          {generating && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white z-20">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm font-semibold animate-pulse">AI 正在渲染超高分辨率 360°/720° 投影全景图...</p>
              <p className="text-2xs text-ink-dim mt-1.5">这通常需要 10 ~ 15 秒，请稍候</p>
            </div>
          )}

          {/* 底部浮动全景指南 */}
          {asset.panoramaPath && viewMode === '3d' && (
            <div className="absolute bottom-3 left-3 bg-black/70 border border-line-soft px-3 py-1.5 rounded-md text-[10px] text-ink-dim z-10 select-none pointer-events-none">
              🖱️ **操作指南**: 鼠标左键点击并**拖拽**以旋转视角；鼠标**滚轮**滚动以放大/缩小空间。
            </div>
          )}
        </div>

        {/* 右侧：属性细节编辑 */}
        <div className="w-80 shrink-0 border-l border-line bg-panel p-4 space-y-4 overflow-auto">
          <div>
            <label className="block text-2xs text-ink-dim mb-1 font-bold">场景资产名称</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-8 px-2 bg-panel-deep border border-line text-xs text-ink focus:border-accent focus:outline-none rounded-sm font-medium"
              placeholder="如：破败的城隍庙"
            />
          </div>

          <div>
            <label className="block text-2xs text-ink-dim mb-1 font-bold">场景细节描述 (Prompt)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="w-full p-2.5 bg-panel-deep border border-line text-xs text-ink resize-none focus:border-accent focus:outline-none rounded-sm leading-relaxed"
              placeholder="描述当前场景的环境、时间、光线、氛围、陈设等细节。这些细节将直接用于渲染 720 度的高精度全景图！"
            />
          </div>

          <div className="pt-2 border-t border-line space-y-2">
            <h4 className="text-xs font-bold text-ink">📥 导入本地平面全景图</h4>
            <p className="text-2xs text-ink-dim leading-relaxed">
              如果您已有现成的 360° 等距柱状投影全景图，可以直接上传导入 3D 视图中：
            </p>
            <label className="h-8 w-full bg-panel-deep border border-line hover:bg-panel-hover text-ink hover:text-accent hover:border-accent text-xs flex items-center justify-center gap-1.5 cursor-pointer rounded-sm transition-all">
              <span>📁 选择文件导入...</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImportPanorama}
                className="hidden"
              />
            </label>
          </div>

          <div className="pt-2 border-t border-line space-y-3">
            <h4 className="text-xs font-bold text-ink">🌐 渲染规格 & 三维数据</h4>
            <div className="bg-panel-deep border border-line p-3 rounded-sm space-y-2">
              <div className="flex justify-between text-2xs">
                <span className="text-ink-dim">映射模式:</span>
                <span className="text-ink font-mono">球形等距柱状投影 (Equirectangular)</span>
              </div>
              <div className="flex justify-between text-2xs">
                <span className="text-ink-dim">空间视场 (FOV):</span>
                <span className="text-ink font-mono">360° × 180° (720°全空域)</span>
              </div>
              <div className="flex justify-between text-2xs">
                <span className="text-ink-dim">渲染引擎:</span>
                <span className="text-ink font-mono">Three.js WebGL Core</span>
              </div>
              {asset.panoramaPath && (
                <div className="flex justify-between text-2xs">
                  <span className="text-ink-dim">资源状态:</span>
                  <span className="text-accent-dim font-mono">三维空间映射就绪</span>
                </div>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-accent-danger/10 border border-accent-danger/20 text-accent-danger text-2xs rounded-sm break-all leading-normal">
              ⚠️ {errorMsg}
            </div>
          )}

          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={handleSaveMeta}
              className="w-full h-8 bg-accent/10 hover:bg-accent/20 text-accent text-xs font-bold rounded-sm transition-colors"
            >
              保存修改
            </button>
            <button
              onClick={onBack}
              className="w-full h-8 bg-panel-deep border border-line hover:bg-panel-hover text-ink-mute text-xs rounded-sm transition-colors"
            >
              返回列表
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
