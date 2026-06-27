import { formatBRL, reaisToCents } from '@pdv-udv/core'
import type { Produto } from '@/lib/types'

export function ProductGrid({
  produtos,
  onAdd,
}: {
  produtos: Produto[]
  onAdd: (p: Produto) => void
}) {
  if (!produtos.length) {
    return <p className="p-4 text-ink-light">Nenhum produto nesta categoria.</p>
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {produtos.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onAdd(p)}
          className="flex min-h-touch-lg flex-col justify-between rounded-lg border border-line bg-surface p-3 text-left shadow-sm transition hover:border-brand hover:bg-brand-subtle active:scale-[0.98]"
        >
          <span className="text-sm font-semibold leading-tight text-ink">{p.descricao}</span>
          <span className="mt-2 font-bold text-brand">
            {formatBRL(reaisToCents(Number(p.precoVenda)))}
          </span>
        </button>
      ))}
    </div>
  )
}
