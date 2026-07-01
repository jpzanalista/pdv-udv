import { formatBRL } from '@pdv-udv/core'
import { useCallback, useEffect, useState } from 'react'
import { EnviarReciboInline } from '@/components/recibo/EnviarReciboInline'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Input'
import { ApiError, api } from '@/lib/api'
import { fmtDataHora } from '@/lib/datahora'
import type { ContaExtrato } from '@/lib/types'

const METODOS = [
  { id: 'dinheiro', label: 'Dinheiro' },
  { id: 'pix', label: 'Pix' },
  { id: 'cartao_debito', label: 'Cartão Débito' },
  { id: 'cartao_credito', label: 'Cartão Crédito' },
] as const

export function ExtratoModal({
  contaId,
  contaNome,
  timezone,
  onClose,
}: {
  contaId: string
  contaNome: string
  timezone?: string
  onClose: () => void
}) {
  const [extrato, setExtrato] = useState<ContaExtrato | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [pagando, setPagando] = useState(false) // mostra o formulário de pagamento
  const [valor, setValor] = useState('')
  const [metodo, setMetodo] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    try {
      setExtrato(await api<ContaExtrato>(`/contas/${contaId}/extrato`))
    } catch {
      setErro('Não foi possível carregar o extrato.')
    } finally {
      setCarregando(false)
    }
  }, [contaId])

  useEffect(() => {
    carregar()
  }, [carregar])

  function abrirPagamento() {
    setValor(((extrato?.saldoCents ?? 0) / 100).toFixed(2)) // default = saldo em aberto
    setMetodo(null)
    setPagando(true)
  }

  async function confirmarPagamento() {
    const reais = Number(valor.replace(',', '.'))
    const valorCents = Math.round(reais * 100)
    if (!Number.isFinite(reais) || valorCents <= 0) {
      setErro('Informe um valor válido.')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      await api(`/contas/${contaId}/pagamento`, {
        method: 'POST',
        body: JSON.stringify({ valorCents, metodo: metodo ?? undefined }),
      })
      setPagando(false)
      await carregar()
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Erro ao registrar o pagamento.')
    } finally {
      setSalvando(false)
    }
  }

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

        {extrato && (
          <>
            <div className="mb-3 flex items-baseline justify-between rounded-lg bg-canvas p-3">
              <span className="font-semibold text-ink-muted">Saldo em aberto</span>
              <span
                className={`text-2xl font-bold ${extrato.saldoCents > 0 ? 'text-danger' : 'text-success'}`}
              >
                {formatBRL(extrato.saldoCents)}
              </span>
            </div>

            {pagando ? (
              <div className="mb-4 rounded-lg border border-line p-3">
                <p className="mb-2 font-semibold">Registrar pagamento</p>
                <Field label="Valor (R$)" htmlFor="pg-valor">
                  <Input
                    id="pg-valor"
                    inputMode="decimal"
                    autoFocus
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                  />
                </Field>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {METODOS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMetodo(m.id)}
                      className={`min-h-touch rounded border px-3 text-sm font-semibold ${
                        metodo === m.id
                          ? 'border-brand bg-brand-bg text-brand-dark'
                          : 'border-line bg-surface text-ink-muted hover:bg-canvas'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setPagando(false)}
                    disabled={salvando}
                  >
                    Cancelar
                  </Button>
                  <Button className="flex-1" onClick={confirmarPagamento} disabled={salvando}>
                    {salvando ? 'Registrando…' : 'Registrar'}
                  </Button>
                </div>
              </div>
            ) : (
              extrato.saldoCents > 0 && (
                <Button className="mb-4 w-full" onClick={abrirPagamento}>
                  Registrar pagamento
                </Button>
              )
            )}

            {erro && <p className="mb-2 text-sm text-danger">{erro}</p>}

            {extrato.movimentos.length === 0 ? (
              <p className="text-ink-light">Nenhuma compra ou pagamento ainda.</p>
            ) : (
              <ul className="divide-y divide-line">
                {extrato.movimentos.map((m) => {
                  // Débito de uma venda que foi cancelada por inteiro → marca a compra como cancelada.
                  const compraCancelada = m.tipo === 'debito' && m.venda?.cancelada === true
                  return (
                    <li key={m.id} className="py-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="flex items-center gap-2 text-sm text-ink-muted">
                          {fmtDataHora(m.data, timezone)}
                          {compraCancelada && (
                            <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-danger">
                              Cancelada
                            </span>
                          )}
                        </span>
                        <span
                          className={`font-semibold ${
                            compraCancelada
                              ? 'text-ink-light line-through'
                              : m.tipo === 'debito'
                                ? 'text-ink'
                                : 'text-success'
                          }`}
                        >
                          {m.tipo === 'debito' ? '' : '− '}
                          {formatBRL(m.valorCents)}
                        </span>
                      </div>
                      {/* Crédito de estorno/cancelamento vem com venda vinculada: mostra o motivo. */}
                      {m.tipo === 'credito' && m.venda && m.descricao && (
                        <p className="mt-1 text-sm font-medium text-success">{m.descricao}</p>
                      )}
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
                      {/* Recibo só na compra (débito de venda). */}
                      {m.tipo === 'debito' && m.venda && (
                        <div className="mt-2">
                          <EnviarReciboInline
                            vendaId={m.venda.id}
                            enviadoEm={m.venda.reciboEnviadoEm}
                            telefoneSugerido={m.venda.reciboTelefone ?? extrato.conta.whatsapp}
                            timezone={timezone}
                          />
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}

        {!extrato && erro && <p className="text-danger">{erro}</p>}
      </Card>
    </div>
  )
}
