import { useProject } from '../store/project'
import { useGenerate } from '../store/generate'
import { useStage } from '../store/stage'
import { STAGE_LABELS } from '../types/project'

export function StatusBar() {
  const { lastSavedAt, saveStatus, lastSaveError, shots, chapters, providers } = useProject()
  const { tasks } = useGenerate()
  const { stage } = useStage()

  const savedText = lastSavedAt
    ? `已保存 ${formatTime(lastSavedAt)}`
    : '未保存'

  const runningTasks = tasks.filter((t) => t.status === 'running' || t.status === 'queued').length
  const llmCount = providers.filter((p) => p.kind === 'llm' && p.enabled).length

  const saveDisplay = saveStatus === 'saving'
    ? '保存中…'
    : saveStatus === 'error'
      ? `保存失败: ${lastSaveError ?? '未知错误'}`
      : savedText

  return (
    <footer className="h-6 shrink-0 flex items-center px-3 bg-panel border-t border-line text-2xs text-ink-mute font-mono">
      <span>{STAGE_LABELS[stage]}</span>
      <Sep />
      <span>{chapters.length} 章 / {shots.length} 镜</span>
      <Sep />
      <span>队列 {runningTasks}</span>
      <Sep />
      <span>LLM {llmCount > 0 ? `${llmCount} 可用` : '未配置'}</span>
      <Sep />
      <span
        className={saveStatus === 'error' ? 'text-red-400' : ''}
        title={saveStatus === 'error' ? (lastSaveError ?? '') : lastSavedAt ? new Date(lastSavedAt).toLocaleString() : ''}
      >
        {saveDisplay}
      </span>
      <span className="ml-auto flex items-center gap-3">
        <span>v0.1.0</span>
      </span>
    </footer>
  )
}

function Sep() {
  return <span className="mx-2 text-ink-dim">|</span>
}

function formatTime(t: number): string {
  const d = new Date(t)
  const today = new Date()
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return sameDay ? `${hh}:${mm}` : `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`
}
