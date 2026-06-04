import { useEffect } from 'react'

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 'full'
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  width?: 'full' | 'lg' | 'md'
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const widthCls = width === 'full'
    ? 'inset-6'
    : width === 'lg'
    ? 'inset-x-[10vw] inset-y-[8vh]'
    : 'inset-x-[20vw] inset-y-[15vh]'

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className={`absolute ${widthCls} bg-panel border border-line shadow-2xl flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-9 shrink-0 flex items-center justify-between px-4 bg-panel-raised border-b border-line">
          <span className="text-xs text-ink font-medium">{title}</span>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center text-ink-mute hover:text-ink hover:bg-panel-hover"
          >
            <span className="text-base leading-none">×</span>
          </button>
        </div>
        <div className="flex-1 min-h-0 flex">{children}</div>
      </div>
    </div>
  )
}
