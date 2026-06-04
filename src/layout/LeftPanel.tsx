import { useState } from 'react'
import { useStage } from '../store/stage'
import { useProject } from '../store/project'
import { useGenerate } from '../store/generate'
import { ASSET_CATEGORY_LABELS, CAMERA_LABELS, chapterLabel, shotLabel } from '../types/project'
import type { AssetCategory } from '../types/project'

const ASSET_TABS: AssetCategory[] = ['character', 'scene', 'prop', 'text', 'sfx', 'bgm']

export function LeftPanel() {
  const { stage } = useStage()
  const { projectLoaded } = useProject()

  if (stage === 'projects' || stage === 'library' || stage === 'settings' || !projectLoaded) return null

  return (
    <aside className="w-60 shrink-0 bg-panel border-r border-line flex flex-col">
      {stage === 'worldbuilding' && <WorldBuildingNav />}
      {stage === 'outline' && <OutlineTree />}
      {stage === 'chapter' && <ChapterList />}
      {stage === 'storyboard' && <ShotList />}
      {stage === 'generate' && <GenerateQueue />}
    </aside>
  )
}

// ===== 世界观导航 =====
function WorldBuildingNav() {
  return (
    <>
      <PanelHeader title="故事背景" />
      <div className="flex-1 overflow-auto py-1">
        <Section label="必要设置" />
        <Row indent={1}>故事梗概</Row>
        <Row indent={1}>题材 / 节奏</Row>
        <Row indent={1}>总集数 / 单集时长</Row>
        <Row indent={1}>角色设定</Row>
      </div>
      <PanelDivider />
      <AssetLibraryMini />
    </>
  )
}

// ===== 大纲阶段: 故事结构 =====
function OutlineTree() {
  const { acts, addAct, removeAct, selectAct, selectedActId, chapters } = useProject()

  return (
    <>
      <PanelHeader title="故事结构" />
      <div className="flex-1 overflow-auto py-1">
        <Section label="故事点" />
        {acts.map((a) => (
          <RowGroup
            key={a.id}
            label={`${a.index} · ${a.title}`}
            active={selectedActId === a.id}
            onClick={() => selectAct(a.id)}
            onRemove={() => removeAct(a.id)}
          />
        ))}
        <div className="px-3 py-2">
          <button
            onClick={addAct}
            className="w-full h-6 border border-dashed border-line text-2xs text-ink-dim hover:border-ink-mute hover:text-ink-mute"
          >
            + 新增故事点
          </button>
        </div>

        <Section label={`章节 (${chapters.length})`} />
        {chapters.length === 0 ? (
          <Row indent={1} muted>尚无章节</Row>
        ) : (
          chapters.map((c) => (
            <Row key={c.id} indent={1}>
              {chapterLabel(c)} {c.title && `· ${c.title}`}
            </Row>
          ))
        )}
      </div>
      <PanelDivider />
      <AssetLibraryMini />
    </>
  )
}

// ===== 章节阶段 =====
function ChapterList() {
  const { acts, chapters, selectedChapterId, selectChapter, addChapter, removeChapter } = useProject()

  return (
    <>
      <PanelHeader title="章节" />
      <div className="flex-1 overflow-auto py-1">
        {chapters.length === 0 && <Row indent={0} muted>尚无章节</Row>}
        {acts.map((act) => {
          const actChapters = chapters.filter((c) => c.actId === act.id)
          if (actChapters.length === 0 && chapters.some((c) => c.actId)) return null
          return (
            <div key={act.id}>
              <Section label={`${act.index} · ${act.title}`} />
              {actChapters.map((c) => (
                <RowGroup
                  key={c.id}
                  label={`${chapterLabel(c)} ${c.title && `· ${c.title}`}`}
                  active={selectedChapterId === c.id}
                  onClick={() => selectChapter(c.id)}
                  onRemove={() => removeChapter(c.id)}
                />
              ))}
              <div className="px-3 py-1">
                <button
                  onClick={() => addChapter(act.id)}
                  className="w-full h-5 border border-dashed border-line text-2xs text-ink-dim hover:border-ink-mute hover:text-ink-mute"
                >
                  + 新增章节
                </button>
              </div>
            </div>
          )
        })}
        {/* 未关联故事点的章节 (兼容旧数据) */}
        {chapters.filter((c) => !c.actId).length > 0 && (
          <>
            <Section label="未关联" />
            {chapters.filter((c) => !c.actId).map((c, i) => (
              <RowGroup
                key={c.id}
                label={`第 ${i + 1} 章 ${c.title && `· ${c.title}`}`}
                active={selectedChapterId === c.id}
                onClick={() => selectChapter(c.id)}
                onRemove={() => removeChapter(c.id)}
              />
            ))}
          </>
        )}
      </div>
      <PanelDivider />
      <div className="shrink-0">
        <PanelHeader title="章节素材" />
        <div className="p-2 text-2xs text-ink-dim">
          从公共素材库拖入引用
        </div>
      </div>
    </>
  )
}

// ===== 分镜阶段 =====
function ShotList() {
  const {
    shots, selectedShotId, selectedChapterId, chapters, acts,
    selectShot, addShot, removeShot
  } = useProject()

  const list = selectedChapterId
    ? shots.filter((s) => s.chapterId === selectedChapterId)
    : shots

  const currentChapter = chapters.find((c) => c.id === selectedChapterId)
  const currentAct = currentChapter ? acts.find((a) => a.id === currentChapter.actId) : null

  return (
    <>
      <PanelHeader title={`分镜${currentChapter ? ` · ${chapterLabel(currentChapter)} ${currentChapter.title || ''}` : ''}`} />
      {currentAct && (
        <div className="h-5 shrink-0 flex items-center px-3 text-2xs text-ink-dim bg-accent/5 border-b border-line">
          <span className="text-accent font-mono mr-1">{currentAct.index}</span>
          {currentAct.title}
        </div>
      )}
      <div className="flex-1 overflow-auto py-1">
        {list.length === 0 && (
          <div className="px-3 py-4 text-2xs text-ink-dim text-center">
            尚无镜头
          </div>
        )}
        {list.map((s) => (
          <ShotThumb
            key={s.id}
            index={s.index}
            label={currentChapter ? shotLabel(currentChapter, s.index) : undefined}
            scene={s.scene || '未命名'}
            camera={CAMERA_LABELS[s.camera]}
            active={selectedShotId === s.id}
            onClick={() => selectShot(s.id)}
            onRemove={() => removeShot(s.id)}
          />
        ))}
        <div className="px-3 py-2">
          <button
            onClick={() => addShot()}
            className="w-full h-6 border border-dashed border-line text-2xs text-ink-dim hover:border-ink-mute hover:text-ink-mute"
          >
            + 新增镜头
          </button>
        </div>
      </div>
      <PanelDivider />
      <AssetLibraryMini />
    </>
  )
}

// ===== 生成阶段: 任务队列 =====
function GenerateQueue() {
  const { tasks, removeTask, clearDone } = useGenerate()

  const TYPE_LABELS: Record<string, string> = {
    image: '图像', video: '视频', tts: '语音',
    stitch: '拼接', 'three-view': '三视图', text: '文本'
  }
  const STATUS_LABELS: Record<string, string> = {
    queued: '排队', running: '运行', done: '完成', error: '失败'
  }

  return (
    <>
      <PanelHeader title="生成队列" />
      <div className="flex-1 overflow-auto py-1">
        {tasks.length === 0 ? (
          <div className="px-3 py-4 text-xs text-ink-dim text-center">
            暂无任务
          </div>
        ) : (
          <>
            {tasks.map((t) => (
              <div key={t.id} className="group h-8 flex items-center gap-2 px-3 text-xs border-b border-line">
                <span className="text-2xs text-ink-dim w-10 shrink-0">{TYPE_LABELS[t.type] ?? t.type}</span>
                <div className="flex-1 min-w-0">
                  {t.status === 'running' && (
                    <div className="h-1 bg-panel-deep rounded-sm overflow-hidden">
                      <div className="h-full bg-accent transition-all" style={{ width: `${t.progress}%` }} />
                    </div>
                  )}
                  {t.status !== 'running' && (
                    <span className={`text-2xs ${t.status === 'error' ? 'text-accent-danger' : 'text-ink-mute'}`}>
                      {STATUS_LABELS[t.status]}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeTask(t.id)}
                  className="text-2xs text-ink-dim hover:text-accent-danger opacity-0 group-hover:opacity-100"
                >
                  x
                </button>
              </div>
            ))}
            {tasks.some((t) => t.status === 'done' || t.status === 'error') && (
              <div className="px-3 py-1.5">
                <button onClick={clearDone} className="text-2xs text-ink-dim hover:text-ink-mute">
                  清除已完成
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

// ===== 公共素材库 (折叠版) =====
function AssetLibraryMini() {
  const [tab, setTab] = useState<AssetCategory>('character')
  const { assets } = useProject()
  const { setStage } = useStage()

  const filtered = assets.filter((a) => a.category === tab)

  return (
    <div className="shrink-0 h-48 flex flex-col border-t border-line">
      <div className="h-6 shrink-0 flex items-center justify-between px-2 bg-panel-raised border-b border-line">
        <span className="text-2xs text-ink-mute">素材库</span>
        <button
          onClick={() => setStage('library')}
          className="text-2xs text-accent hover:underline"
        >
          展开
        </button>
      </div>
      <div className="h-7 shrink-0 flex items-center bg-panel-deep border-b border-line">
        {ASSET_TABS.map((cat) => (
          <button
            key={cat}
            onClick={() => setTab(cat)}
            title={ASSET_CATEGORY_LABELS[cat]}
            className={[
              'flex-1 h-full text-2xs text-center transition-colors',
              tab === cat ? 'text-ink bg-panel' : 'text-ink-dim hover:text-ink-mute'
            ].join(' ')}
          >
            {ASSET_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto text-2xs">
        {filtered.length === 0 ? (
          <div className="p-2 text-ink-dim">暂无{ASSET_CATEGORY_LABELS[tab]}</div>
        ) : (
          filtered.map((a) => (
            <div
              key={a.id}
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({ id: a.id, category: a.category, name: a.name }))
                e.dataTransfer.effectAllowed = 'copy'
              }}
              className="px-2 py-1.5 hover:bg-panel-hover cursor-grab active:cursor-grabbing text-ink-mute hover:text-ink truncate flex items-center gap-1.5 transition-colors border-b border-line/30 last:border-b-0"
              title={`拖拽 ${a.name} 到右侧的一致性参考栏`}
            >
              <span className="text-[10px] text-ink-dim select-none">☰</span>
              <span className="select-none font-medium">{a.name}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ===== 镜头缩略条 =====
function ShotThumb({ index, label, scene, camera, active, onClick, onRemove }: {
  index: number
  label?: string
  scene: string
  camera: string
  active?: boolean
  onClick?: () => void
  onRemove?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={[
        'group h-10 flex items-center gap-2 px-3 cursor-pointer',
        active ? 'bg-accent/10 text-ink' : 'text-ink-mute hover:bg-panel-hover'
      ].join(' ')}>
      <span className="text-2xs font-mono text-ink-dim w-10 shrink-0">{label ?? String(index).padStart(2, '0')}</span>
      <div className="w-10 h-7 bg-panel-deep border border-line shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-xs truncate">{scene}</div>
        <div className="text-2xs text-ink-dim">{camera}</div>
      </div>
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="text-2xs text-ink-dim hover:text-accent-danger opacity-0 group-hover:opacity-100"
        >
          ×
        </button>
      )}
    </div>
  )
}

// ===== 通用组件 =====
function PanelHeader({ title }: { title: string }) {
  return (
    <div className="h-7 shrink-0 flex items-center px-3 bg-panel-raised border-b border-line text-2xs tracking-wide text-ink-mute font-medium">
      {title}
    </div>
  )
}

function PanelDivider() {
  return <div className="h-px bg-line" />
}

function Section({ label }: { label: string }) {
  return (
    <div className="px-3 pt-2 pb-1 text-2xs tracking-wide text-ink-dim">
      {label}
    </div>
  )
}

function Row({ children, indent = 0, muted, active }: {
  children: React.ReactNode
  indent?: number
  muted?: boolean
  active?: boolean
}) {
  return (
    <div
      className={[
        'h-6 flex items-center text-xs cursor-pointer',
        active ? 'bg-accent/10 text-ink' : 'hover:bg-panel-hover',
        muted ? 'text-ink-dim' : active ? '' : 'text-ink-mute'
      ].join(' ')}
      style={{ paddingLeft: 12 + indent * 12, paddingRight: 12 }}
    >
      {children}
    </div>
  )
}

function RowGroup({ label, active, onClick, onRemove }: {
  label: string
  active?: boolean
  onClick?: () => void
  onRemove?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={[
        'group h-7 flex items-center pr-2 pl-3 text-xs cursor-pointer',
        active ? 'bg-accent/10 text-ink' : 'text-ink-mute hover:bg-panel-hover hover:text-ink'
      ].join(' ')}
    >
      <span className="truncate flex-1">{label}</span>
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="text-2xs text-ink-dim hover:text-accent-danger opacity-0 group-hover:opacity-100 ml-2"
        >
          ×
        </button>
      )}
    </div>
  )
}
