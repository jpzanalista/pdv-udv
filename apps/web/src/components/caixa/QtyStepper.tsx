export function QtyStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-ink-muted">Qtde</span>
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="min-h-touch w-11 rounded border border-line bg-white text-xl font-bold text-ink-muted hover:bg-canvas"
      >
        −
      </button>
      <span className="w-10 text-center text-lg font-bold">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="min-h-touch w-11 rounded border border-line bg-white text-xl font-bold text-ink-muted hover:bg-canvas"
      >
        +
      </button>
    </div>
  )
}
