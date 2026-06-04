import { useStage } from '../store/stage'
import { useProject } from '../store/project'

export function BottomPanel() {
  const { stage } = useStage()
  const { shots, selectedChapterId, selectedShotId, selectShot } = useProject()

  if (stage === 'outline' || stage === 'chapter' || stage === 'storyboard') return null

  const list = selectedChapterId
    ? shots.filter((s) => s.chapterId === selectedChapterId)
    : shots

  const totalDuration = list.reduce((sum, s) => sum + s.duration, 0)
  const mm = String(Math.floor(totalDuration / 60)).padStart(2, '0')
  const ss = String(Math.round(totalDuration % 60)).padStart(2, '0')

  const imgCount = list.filter((s) => s.imagePath).length
  const vidCount = list.filter((s) => s.videoPath).length
  const audioCount = list.filter((s) => s.audioPath).length

  return (
    <div className="h-32 shrink-0 bg-panel border-t border-line flex flex-col">
      <div className="h-6 shrink-0 flex items-center justify-between px-3 bg-panel-raised border-b border-line">
        <span className="text-2xs text-ink-mute tracking-wide">
          视频时间线
        </span>
        <div className="flex items-center gap-3 text-2xs text-ink-dim font-mono">
          <span>{list.length} 镜头</span>
          <span className="text-line-hard">|</span>
          <span>{mm}:{ss}</span>
          <span className="text-line-hard">|</span>
          <span title="已生图 / 已生成视频 / 已配音">
            <span className={imgCount > 0 ? 'text-accent' : ''}>IMG {imgCount}</span>
            {' / '}
            <span className={vidCount > 0 ? 'text-accent' : ''}>VID {vidCount}</span>
            {' / '}
            <span className={audioCount > 0 ? 'text-accent' : ''}>TTS {audioCount}</span>
          </span>
        </div>
      </div>

      {/* 分镜条带 */}
      <div className="flex-1 flex items-stretch overflow-x-auto px-2 py-1.5 gap-1">
        {list.length === 0 ? (
          <div className="flex items-center justify-center w-full text-2xs text-ink-dim">
            暂无镜头
          </div>
        ) : (
          list.map((s) => (
            <ShotStrip
              key={s.id}
              index={s.index}
              duration={s.duration}
              scene={s.scene}
              hasImage={!!s.imagePath}
              hasVideo={!!s.videoPath}
              hasAudio={!!s.audioPath}
              active={s.id === selectedShotId}
              onClick={() => selectShot(s.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function ShotStrip({ index, duration, scene, hasImage, hasVideo, hasAudio, active, onClick }: {
  index: number
  duration: number
  scene?: string
  hasImage?: boolean
  hasVideo?: boolean
  hasAudio?: boolean
  active?: boolean
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={[
        'w-20 shrink-0 flex flex-col border cursor-pointer transition-colors',
        active
          ? 'border-accent bg-accent/5'
          : 'border-line bg-panel-deep hover:bg-panel-hover'
      ].join(' ')}
    >
      <div className="flex-1 flex flex-col items-center justify-center gap-0.5 px-1">
        <span className="text-2xs text-ink-dim font-mono">{String(index).padStart(2, '0')}</span>
        {scene && <span className="text-[9px] text-ink-dim truncate w-full text-center">{scene}</span>}
        <div className="flex gap-1">
          {hasImage && <span className="text-[8px] text-accent">IMG</span>}
          {hasVideo && <span className="text-[8px] text-green-400">VID</span>}
          {hasAudio && <span className="text-[8px] text-amber-400">TTS</span>}
        </div>
      </div>
      <div className="h-4 shrink-0 bg-panel-raised/50 flex items-center justify-center border-t border-line">
        <span className="text-[9px] text-ink-dim font-mono">{duration.toFixed(1)}s</span>
      </div>
    </div>
  )
}
