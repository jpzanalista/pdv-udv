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

      <div className="min-h-0 flex-1 overflow-auto">
        {items.length === 0 ? (
          <p className="p-6 text-center text-base text-ink-light">
            Carrinho vazio.
            <br />
            Toque nos produtos.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-canvas text-xs uppercase tracking-wide text-ink-light">
              <tr>
                <th className="px-2 py-1.5 text-left">Produto</th>
                <th className="px-1 py-1.5 text-center">Qtd</th>
                <th className="px-2 py-1.5 text-right">Unit.</th>
                <th className="px-2 py-1.5 text-right">Total</th>
                <th className="px-1" />
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.produtoId} className="border-b border-line/60 last:border-0">
                  <td className="px-2 py-2">
                    <span className="line-clamp-2 text-base font-semibold leading-tight text-ink">
                      {i.descricao}
                    </span>
                  </td>
                  <td className="px-1 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => onDec(i.produtoId)}
                        className="h-8 w-8 rounded-lg border border-line bg-surface font-bold text-ink-muted hover:bg-canvas"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-base font-bold text-ink">{i.qtde}</span>
                      <button
                        type="button"
                        onClick={() => onInc(i.produtoId)}
                        className="h-8 w-8 rounded-lg border border-line bg-surface font-bold text-ink-muted hover:bg-canvas"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right text-ink-muted">
                    {formatBRL(i.unitario)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right font-bold text-ink">
                    {formatBRL(i.unitario * i.qtde)}
                  </td>
                  <td className="px-1 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onRemove(i.produtoId)}
                      className="px-1 text-lg text-danger"
                      aria-label="Remover"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
