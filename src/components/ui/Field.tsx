export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-ink-dim mb-1.5">{label}</div>
      {children}
    </div>
  )
}
