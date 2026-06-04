import { useStage } from '../store/stage'
import { useProject } from '../store/project'
import { useGenerate } from '../store/generate'
import type { SaveStatus } from '../store/project'
import { STAGES, STAGE_LABELS } from '../types/project'

export function TitleBar() {
  const { stage, setStage } = useStage()
  const { name, setName, saveStatus, saveNow, manualBackup, projectLoaded, closeProject } = useProject()
  const { tasks } = useGenerate()
  const activeTaskCount = tasks.filter((t) => t.status === 'running' || t.status === 'queued').length

  return (
    <header className="h-11 shrink-0 flex items-stretch bg-panel border-b border-line text-xs select-none app-drag">
      {/* Logo + 项目名 */}
      <div className="flex items-center gap-2 px-4 border-r border-line app-no-drag">
        <span className="font-mono tracking-[0.2em] text-ink text-2xs font-semibold">LUMEN</span>
        <span className="text-line-hard">/</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => saveNow()}
          className="text-ink-mute text-xs bg-transparent border-b border-transparent hover:border-line focus:border-accent focus:text-ink focus:outline-none w-40 py-0.5"
          placeholder="未命名项目"
        />
        <SaveStatusBadge status={saveStatus} />
      </div>

      {/* 管线阶段导航 (项目管理为启动界面, 不在编辑器管线内) */}
      <nav className="flex items-stretch app-no-drag">
        {STAGES.filter((s) => s !== 'projects').map((s, i) => {
          const active = s === stage
          const locked = s !== 'settings' && !projectLoaded
          return (
            <button
              key={s}
              onClick={() => !locked && setStage(s)}
              disabled={locked}
              className={[
                'px-5 flex items-center gap-1.5 border-r border-line transition-colors duration-100',
                locked
                  ? 'bg-panel text-ink-dim/40 cursor-not-allowed border-b-2 border-b-transparent'
                  : active
                    ? 'bg-panel-deep text-ink border-b-2 border-b-accent'
                    : 'bg-panel text-ink-mute hover:bg-panel-hover hover:text-ink border-b-2 border-b-transparent'
              ].join(' ')}
            >
              <span className="text-2xs text-ink-dim font-mono">{i + 1}</span>
              <span className="text-xs">{STAGE_LABELS[s]}</span>
            </button>
          )
        })}
      </nav>

      {/* 右侧工具区 */}
      <div className="ml-auto flex items-stretch app-no-drag">
        {projectLoaded && <ToolButton onClick={() => manualBackup()} label="备份" title="保存并创建一份本地备份 (云备份后期接入 OSS)" />}
        {projectLoaded && (
          <button
            onClick={() => { closeProject(); setStage('projects') }}
            className="h-full px-3 flex items-center text-xs text-ink-dim hover:text-accent-danger hover:bg-panel-hover transition-colors"
            title="关闭当前项目，返回项目管理"
          >
            关闭项目
          </button>
        )}
        <div className="flex items-center gap-3 px-4">
          <span className="text-2xs text-ink-dim font-mono">队列 {activeTaskCount}</span>
          <button className="h-6 px-3 bg-accent/10 text-accent text-xs hover:bg-accent/20">
            导出
          </button>
        </div>
      </div>
    </header>
  )
}

function ToolButton({ label, onClick, title }: { label: string; onClick: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="px-4 text-xs text-ink-mute hover:bg-panel-hover hover:text-ink border-l border-line transition-colors"
    >
      {label}
    </button>
  )
}

const STATUS_TEXT: Record<SaveStatus, { label: string; cls: string }> = {
  idle:   { label: '',       cls: '' },
  dirty:  { label: '未保存', cls: 'text-amber-300' },
  saving: { label: '保存中', cls: 'text-accent' },
  saved:  { label: '已保存', cls: 'text-accent-dim' },
  error:  { label: '保存失败', cls: 'text-accent-danger' }
}

function SaveStatusBadge({ status }: { status: SaveStatus }) {
  const s = STATUS_TEXT[status]
  if (!s.label) return null
  return <span className={`ml-1 text-2xs ${s.cls}`}>{s.label}</span>
}
