export function NavItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        'h-9 flex items-center px-4 text-xs text-left border-l-2 transition-colors',
        active
          ? 'bg-accent/10 text-ink border-l-accent font-semibold'
          : 'text-ink-mute hover:bg-panel-hover hover:text-ink border-l-transparent'
      ].join(' ')}
    >
      {label}
    </button>
  )
}
