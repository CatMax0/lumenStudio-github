import { useState, useEffect } from 'react'
import { useProject } from '../store/project'
import { useStage } from '../store/stage'
import { formatDate } from '../utils/formatDate'
import type { ProjectMetaT } from '@shared/ipc'

export function ProjectsWorkspace() {
  const { id: activeProjectId, loadProjectById, createNewProject, deleteProjectById } = useProject()
  const { setStage } = useStage()
  const [projects, setProjects] = useState<ProjectMetaT[]>([])
  const [newProjectName, setNewProjectName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const refreshProjects = async () => {
    try {
      const api = (window as any).lumen?.project
      if (api?.list) {
        const list = await api.list()
        setProjects(list)
        setError('')
      }
    } catch (err) {
      console.error('[ProjectsWorkspace] Failed to list projects:', err)
      setError(err instanceof Error ? err.message : '加载项目列表失败')
    }
  }

  useEffect(() => {
    refreshProjects()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newProjectName.trim()
    if (!name) return
    setLoading(true)
    setError('')
    try {
      await createNewProject(name)
      setNewProjectName('')
      setStage('worldbuilding') // automatically jump to worldbuilding workspace on creation!
    } catch (err: any) {
      setError(err?.message || '新建项目失败')
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = async (id: string) => {
    setLoading(true)
    setError('')
    try {
      await loadProjectById(id)
      setStage('worldbuilding') // jump to worldbuilding stage on load
    } catch (err) {
      console.error('[ProjectsWorkspace] Load project failed:', err)
      setError(err instanceof Error ? err.message : '加载项目失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation() // prevent opening the project on card click
    const confirmed = window.confirm(`确认要删除项目「${name}」吗？\n\n注意：此操作不可逆，将物理删除该项目的工程文件、剧本配置和专属生图素材文件夹！`)
    if (!confirmed) return

    try {
      await deleteProjectById(id)
      await refreshProjects()
    } catch (err) {
      console.error('[ProjectsWorkspace] Delete project failed:', err)
      setError(err instanceof Error ? err.message : '删除项目失败')
    }
  }

  const handleOpenDir = async () => {
    try {
      const api = (window as any).lumen?.project
      if (api?.openDir) {
        await api.openDir()
      }
    } catch (err) {
      console.error('[ProjectsWorkspace] Open dir failed:', err)
      setError(err instanceof Error ? err.message : '打开目录失败')
    }
  }



  return (
    <div className="flex-1 overflow-auto bg-panel-deep p-6 md:p-8 flex justify-center select-text">
      <div className="max-w-4xl w-full space-y-6 md:space-y-8">
        {/* Splash Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-6">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-bold font-mono tracking-[0.2em] text-ink">
              LUMEN STUDIO
            </h1>
            <p className="text-xs text-ink-dim font-medium">微剧本与 AI 视频分镜智能工作站 · 专业级项目管理器</p>
          </div>
          <button
            onClick={handleOpenDir}
            className="self-start md:self-center h-8 px-3 bg-panel border border-line hover:bg-panel-hover text-2xs text-ink rounded-sm flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
            title="打开本地项目文件夹物理路径"
          >
            打开工程根目录
          </button>
        </div>

        {/* Global error banner */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-accent-danger/10 border border-accent-danger/30 rounded-sm">
            <p className="text-xs text-accent-danger flex-1">{error}</p>
            <button onClick={() => setError('')} className="text-accent-danger/60 hover:text-accent-danger text-xs cursor-pointer">✕</button>
          </div>
        )}

        {/* Column Grid: Create & Switch */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Create Project */}
          <div className="md:col-span-1 bg-panel border border-line p-5 rounded-sm space-y-4 shadow-sm h-fit">
            <h2 className="text-xs font-bold text-ink border-b border-line/50 pb-2">
              新建项目
            </h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[10px] text-ink-dim font-bold">项目名称</label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full h-8 px-2.5 bg-panel-deep border border-line text-xs text-ink focus:border-accent focus:outline-none rounded-sm"
                  placeholder="例如: 绝境除刀"
                />
              </div>
              {error && <p className="text-2xs text-accent-danger leading-relaxed">{error}</p>}
              <button
                type="submit"
                disabled={loading || !newProjectName.trim()}
                className="w-full h-8 bg-accent text-white text-xs hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed font-semibold rounded-sm transition-colors cursor-pointer"
              >
                {loading ? '正在初始化项目...' : '立即新建项目'}
              </button>
            </form>
          </div>

          {/* Right Column: Recent Projects */}
          <div className="md:col-span-2 bg-panel border border-line p-5 rounded-sm space-y-4 shadow-sm">
            <h2 className="text-xs font-bold text-ink border-b border-line/50 pb-2">
              最近打开的剧本工程
            </h2>

            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {projects.length === 0 ? (
                <div className="py-16 text-center text-ink-dim space-y-2">
                  <p className="text-xs font-semibold">暂无任何微剧本工程</p>
                  <p className="text-2xs">在左侧输入名字新建你的第一部剧，开始 AI 创作之旅吧！</p>
                </div>
              ) : (
                projects.map((p) => {
                  const isActive = p.id === activeProjectId
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleOpen(p.id)}
                      className={`group p-3 bg-panel-deep border ${
                        isActive ? 'border-accent bg-accent/2' : 'border-line hover:border-line-hover'
                      } rounded-sm flex items-center justify-between gap-4 transition-all duration-150 cursor-pointer`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 shrink-0 rounded-sm bg-panel border border-line flex items-center justify-center text-xs font-mono text-ink-mute select-none uppercase">
                          {p.name.slice(0, 2)}
                        </span>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-ink group-hover:text-accent transition-colors truncate">
                              {p.name}
                            </span>
                            {isActive && (
                              <span className="text-[9px] scale-90 bg-accent/15 text-accent border border-accent/20 px-1 rounded-sm font-semibold select-none shrink-0">
                                当前打开
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-ink-dim font-mono">
                            <span>ID: {p.id}</span>
                            <span>·</span>
                            <span>更新于: {formatDate(p.updatedAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpen(p.id)
                          }}
                          className="h-6 px-2.5 bg-accent text-white text-[10px] font-semibold rounded-sm hover:bg-accent/80 transition-colors cursor-pointer"
                        >
                          打开
                        </button>
                        <button
                          onClick={(e) => handleDelete(p.id, p.name, e)}
                          className="h-6 px-2 bg-panel border border-line hover:border-accent-danger hover:bg-accent-danger/10 hover:text-accent-danger text-[10px] text-ink-dim rounded-sm transition-colors cursor-pointer"
                          title="删除该项目"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
