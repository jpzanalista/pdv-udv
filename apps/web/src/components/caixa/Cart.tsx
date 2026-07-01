import { calcularTotais, formatBRL } from '@pdv-udv/core'
import { Button } from '@/components/ui/Button'
import type { CartItem } from '@/lib/types'

export function Cart({
  items,
  onInc,
  onDec,
  onRemove,
  onClear,
  onReceber,
}: {
  items: CartItem[]
  onInc: (produtoId: string) => void
  onDec: (produtoId: string) => void
  onRemove: (produtoId: string) => void
  onClear: () => void
  onReceber: () => void
}) {
  const { total } = calcularTotais(items)
  const qtdItens = items.reduce((s, i) => s + i.qtde, 0)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="font-bold text-ink">Carrinho</span>
        <span className="text-sm text-ink-light">{qtdItens} item(ns)</span>
      </div>
      <div className="flex-1 overflow-auto">
        {items.length === 0 ? (
          <p className="p-6 text-center text-base text-ink-light">
            Carrinho vazio.
            <br />
            Toque nos produtos.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((i) => (
              <li key={i.produtoId} className="flex items-center gap-2 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold leading-tight text-ink">{i.descricao}</p>
                  <p className="text-sm text-ink-light">
                    {formatBRL(i.unitario)} · <span className="font-semibold text-ink-muted">{formatBRL(i.unitario * i.qtde)}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDec(i.produtoId)}
                  className="h-10 w-10 rounded-lg border border-line bg-surface text-lg font-bold text-ink-muted hover:bg-canvas"
                >
                  −
                </button>
                <span className="w-7 text-center text-lg font-bold text-ink">{i.qtde}</span>
                <button
                  type="button"
                  onClick={() => onInc(i.produtoId)}
                  className="h-10 w-10 rounded-lg border border-line bg-surface text-lg font-bold text-ink-muted hover:bg-canvas"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(i.produtoId)}
                  className="ml-1 px-2 text-lg text-danger"
                  aria-label="Remover"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-line p-3">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-base font-semibold text-ink-muted">Total</span>
          <span className="text-4xl font-extrabold text-ink">{formatBRL(total)}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="min-h-touch-lg flex-1 text-base" onClick={onClear} disabled={items.length === 0}>
            Cancelar
          </Button>
          <Button
            className="min-h-touch-lg flex-[2] text-base"
            onClick={onReceber}
            disabled={items.length === 0}
          >
            Receber
          </Button>
        </div>
      </div>
    </div>
  )
}
