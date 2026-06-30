'use client'

import { formatBRL } from '@pdv-udv/core'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { QuitarModal } from '@/components/portal/QuitarModal'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ApiError, api } from '@/lib/api'
import { clearTokens, getToken } from '@/lib/auth'
import type { ContaExtrato } from '@/lib/types'

type PortalConta = { id: string; nome: string; tipo: string; saldoCents: number }

const TIPO_LABEL: Record<string, string> = {
  socio: 'Sócio',
  visitante: 'Visitante',
  institucional: 'Institucional',
}

function dataBR(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function PortalPage() {
  const router = useRouter()
  const [contas, setContas] = useState<PortalConta[]>([])
  const [carregando, setCarregando] = useState(true)
  const [aberta, setAberta] = useState<string | null>(null)
  const [extratos, setExtratos] = useState<Record<string, ContaExtrato>>({})
  const [quitar, setQuitar] = useState<{ id: string; nome: string; saldoCents: number } | null>(null)
  const [fechamento, setFechamento] = useState<{ bloqueado: boolean; reabreEm: string | null }>({
    bloqueado: false,
    reabreEm: null,
  })

  const carregar = useCallback(async () => {
    try {
      setContas(await api<PortalConta[]>('/portal/contas'))
      setFechamento(await api<{ bloqueado: boolean; reabreEm: string | null }>('/portal/fechamento'))
      setExtratos({}) // força recarregar o extrato ao reabrir
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        router.replace('/portal/login')
      }
    } finally {
      setCarregando(false)
    }
  }, [router])

  useEffect(() => {
    if (!getToken()) {
      router.replace('/portal/login')
      return
    }
    carregar()
  }, [router, carregar])

  async function alternar(id: string) {
    if (aberta === id) {
      setAberta(null)
      return
    }
    setAberta(id)
    if (!extratos[id]) {
      try {
        const ext = await api<ContaExtrato>(`/portal/contas/${id}/extrato`)
        setExtratos((prev) => ({ ...prev, [id]: ext }))
      } catch {
        // silencioso — o card continua expandido sem detalhes
      }
    }
  }

  function sair() {
    clearTokens()
    router.replace('/portal/login')
  }

  if (carregando) return <main className="p-8 text-ink-muted">Carregando…</main>

  return (
    <main className="mx-auto max-w-md p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand">Minha conta</h1>
        <Button variant="ghost" className="text-sm" onClick={sair}>
          Sair
        </Button>
      </div>

      {fechamento.bloqueado && (
        <Card className="mb-3 border-warning bg-warning/10 p-4">
          <p className="font-semibold text-ink">Fechamento mensal em andamento</p>
          <p className="mt-1 text-sm text-ink-muted">
            A quitação por Pix está temporariamente indisponível
            {fechamento.reabreEm ? `, reabre às ${dataBR(fechamento.reabreEm)}` : ''}. Suas compras do
            mês estão sendo enviadas à tesouraria.
          </p>
        </Card>
      )}

      {contas.length === 0 ? (
        <Card className="p-5 text-ink-muted">Nenhuma conta vinculada ao seu CPF.</Card>
      ) : (
        <div className="space-y-3">
          {contas.map((c) => {
            const ext = extratos[c.id]
            const expandida = aberta === c.id
            return (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{c.nome}</p>
                    <p className="text-sm text-ink-light">{TIPO_LABEL[c.tipo] ?? c.tipo}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-ink-light">Em aberto</p>
                    <p
                      className={`text-xl font-bold ${c.saldoCents > 0 ? 'text-danger' : 'text-success'}`}
                    >
                      {formatBRL(c.saldoCents)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" className="flex-1 text-sm" onClick={() => alternar(c.id)}>
                    {expandida ? 'Ocultar' : 'Ver extrato'}
                  </Button>
                  <Button
                    className="flex-1 text-sm"
                    disabled={c.saldoCents <= 0 || fechamento.bloqueado}
                    onClick={() => setQuitar({ id: c.id, nome: c.nome, saldoCents: c.saldoCents })}
                  >
                    Quitar via Pix
                  </Button>
                </div>

                {expandida && (
                  <div className="mt-3 border-t border-line pt-3">
                    {!ext ? (
                      <p className="text-sm text-ink-light">Carregando…</p>
                    ) : ext.movimentos.length === 0 ? (
                      <p className="text-sm text-ink-light">Nenhuma compra ou pagamento ainda.</p>
                    ) : (
                      <ul className="divide-y divide-line">
                        {ext.movimentos.map((m) => (
                          <li key={m.id} className="py-2">
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="text-xs text-ink-muted">{dataBR(m.data)}</span>
                              <span
                                className={`text-sm font-semibold ${m.tipo === 'debito' ? 'text-ink' : 'text-success'}`}
                              >
                                {m.tipo === 'debito' ? '' : '− '}
                                {formatBRL(m.valorCents)}
                              </span>
                            </div>
                            {m.venda ? (
                              <ul className="mt-1 text-xs text-ink-muted">
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
                              <p className="mt-1 text-xs text-ink-muted">
                                {m.descricao ?? (m.tipo === 'credito' ? 'Pagamento' : 'Lançamento')}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {quitar && (
        <QuitarModal
          contaId={quitar.id}
          contaNome={quitar.nome}
          saldoCents={quitar.saldoCents}
          onAtualizar={carregar}
          onClose={() => setQuitar(null)}
        />
      )}
    </main>
  )
}
