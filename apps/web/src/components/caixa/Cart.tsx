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

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto">
        {items.length === 0 ? (
          <p className="p-4 text-ink-light">Carrinho vazio. Toque nos produtos.</p>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((i) => (
              <li key={i.produtoId} className="flex items-center gap-2 p-2">
                <div className="flex-1">
                  <p className="text-sm font-semibold leading-tight">{i.descricao}</p>
                  <p className="text-xs text-ink-light">
                    {formatBRL(i.unitario)} · subtotal {formatBRL(i.unitario * i.qtde)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDec(i.produtoId)}
                  className="min-h-touch w-9 rounded border border-line bg-white font-bold text-ink-muted"
                >
                  −
                </button>
                <span className="w-6 text-center font-bold">{i.qtde}</span>
                <button
                  type="button"
                  onClick={() => onInc(i.produtoId)}
                  className="min-h-touch w-9 rounded border border-line bg-white font-bold text-ink-muted"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(i.produtoId)}
                  className="ml-1 px-2 text-danger"
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
          <span className="text-ink-muted">Total</span>
          <span className="text-3xl font-bold text-ink">{formatBRL(total)}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClear} disabled={items.length === 0}>
            Cancelar
          </Button>
          <Button
            className="flex-1 min-h-touch-lg"
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
