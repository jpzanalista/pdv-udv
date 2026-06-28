import { formatBRL } from '@pdv-udv/core'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'
import type { ContaExtrato } from '@/lib/types'

function dataBR(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ExtratoModal({
  contaId,
  contaNome,
  onClose,
}: {
  contaId: string
  contaNome: string
  onClose: () => void
}) {
  const [extrato, setExtrato] = useState<ContaExtrato | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    api<ContaExtrato>(`/contas/${contaId}/extrato`)
      .then(setExtrato)
      .catch(() => setErro(true))
      .finally(() => setCarregando(false))
  }, [contaId])

  return (
    <div
      className="fixed inset-0 z-10 flex items-start justify-center overflow-auto bg-black/40 p-4"
      onClick={onClose}
    >
      <Card className="my-6 w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Extrato</h2>
            <p className="text-ink-muted">{contaNome}</p>
          </div>
          <button type="button" onClick={onClose} className="px-2 text-ink-light">
            ✕
          </button>
        </div>

        {carregando && <p className="text-ink-muted">Carregando…</p>}
        {erro && <p className="text-danger">Não foi possível carregar o extrato.</p>}

        {extrato && (
          <>
            <div className="mb-4 flex items-baseline justify-between rounded-lg bg-canvas p-3">
              <span className="font-semibold text-ink-muted">Saldo em aberto</span>
              <span
                className={`text-2xl font-bold ${extrato.saldoCents > 0 ? 'text-danger' : 'text-success'}`}
              >
                {formatBRL(extrato.saldoCents)}
              </span>
            </div>

            {extrato.movimentos.length === 0 ? (
              <p className="text-ink-light">Nenhuma compra ou pagamento ainda.</p>
            ) : (
              <ul className="divide-y divide-line">
                {extrato.movimentos.map((m) => (
                  <li key={m.id} className="py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm text-ink-muted">{dataBR(m.data)}</span>
                      <span
                        className={`font-semibold ${m.tipo === 'debito' ? 'text-ink' : 'text-success'}`}
                      >
                        {m.tipo === 'debito' ? '' : '− '}
                        {formatBRL(m.valorCents)}
                      </span>
                    </div>
                    {m.venda ? (
                      <ul className="mt-1 text-sm text-ink-muted">
                        {m.venda.itens.map((it, i) => (
                          <li key={i} className="flex justify-between">
                            <span>
                              {it.qtde}× {it.descricao}
                            </span>
                            <span>{formatBRL(it.totalCents)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-sm text-ink-muted">
                        {m.descricao ?? (m.tipo === 'credito' ? 'Pagamento' : 'Lançamento')}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
