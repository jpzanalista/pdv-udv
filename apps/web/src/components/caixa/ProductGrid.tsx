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
    return <p className="p-6 text-center text-base text-ink-light">Nenhum produto encontrado.</p>
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {produtos.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onAdd(p)}
          className="flex min-h-[92px] flex-col justify-between gap-1 rounded-xl border border-line bg-surface p-3 text-left shadow-sm transition hover:border-brand hover:bg-brand-bg/40 hover:shadow-md active:scale-[0.98]"
        >
          <span className="text-base font-semibold leading-tight text-ink">{p.descricao}</span>
          <span className="text-lg font-extrabold text-brand">
            {formatBRL(reaisToCents(Number(p.precoVenda)))}
          </span>
        </button>
      ))}
    </div>
  )
}
