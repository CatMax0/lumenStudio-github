export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 pt-4 pb-1 text-2xs text-ink-dim tracking-wide font-bold">
      {children}
    </div>
  )
}
