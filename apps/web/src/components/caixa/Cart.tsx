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

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {items.length === 0 ? (
          <p className="p-6 text-center text-base text-ink-light">
            Carrinho vazio.
            <br />
            Toque nos produtos.
          </p>
        ) : (
          <ul className="divide-y divide-line/60">
            {items.map((i) => (
              <li key={i.produtoId} className="px-3 py-2.5">
                {/* Nome + remover */}
                <div className="flex items-start justify-between gap-2">
                  <span className="text-base font-semibold leading-tight text-ink">
                    {i.descricao}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(i.produtoId)}
                    className="-mr-1 shrink-0 px-1 text-lg leading-none text-ink-light hover:text-danger"
                    aria-label="Remover"
                  >
                    ✕
                  </button>
                </div>

                {/* Qtde + valores */}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onDec(i.produtoId)}
                      className="h-9 w-9 rounded-lg border border-line bg-surface text-lg font-bold text-ink-muted hover:bg-canvas"
                    >
                      −
                    </button>
                    <span className="w-7 text-center text-lg font-bold text-ink">{i.qtde}</span>
                    <button
                      type="button"
                      onClick={() => onInc(i.produtoId)}
                      className="h-9 w-9 rounded-lg border border-line bg-surface text-lg font-bold text-ink-muted hover:bg-canvas"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right leading-tight">
                    <div className="text-xs text-ink-light">
                      {i.qtde} × {formatBRL(i.unitario)}
                    </div>
                    <div className="text-lg font-bold text-ink">
                      {formatBRL(i.unitario * i.qtde)}
                    </div>
                  </div>
                </div>
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
          <Button
            variant="ghost"
            className="min-h-touch-lg flex-1 text-base"
            onClick={onClear}
            disabled={items.length === 0}
          >
            Cancelar <span className="hidden text-xs opacity-60 sm:inline">(F11)</span>
          </Button>
          <Button
            className="min-h-touch-lg flex-[2] text-base"
            onClick={onReceber}
            disabled={items.length === 0}
          >
            Receber <span className="hidden text-xs opacity-80 sm:inline">(F12)</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
