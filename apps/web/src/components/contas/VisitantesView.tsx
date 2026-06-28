import { formatBRL } from '@pdv-udv/core'
import { useCallback, useEffect, useState } from 'react'
import { ContaFormModal } from '@/components/contas/ContaFormModal'
import { Button } from '@/components/ui/Button'
import { ApiError, api } from '@/lib/api'
import type { ContaRow } from '@/lib/types'

type VisitanteStatus = {
  id: string
  nome: string
  ativa: boolean
  whatsapp: string | null
  titularCpf: string | null
  saldoCents: number
  status: 'pago' | 'a_cobrar' | 'enviado' | 'inadimplente'
  vencimento: string | null
  invoiceUrl: string | null
  itensAbertos: { data: string; valorCents: number; descricao: string | null }[]
}

const BADGE: Record<VisitanteStatus['status'], { label: string; cls: string }> = {
  inadimplente: { label: 'Inadimplente', cls: 'bg-danger/15 text-danger' },
  enviado: { label: 'Enviado', cls: 'bg-brand-bg text-brand-dark' },
  a_cobrar: { label: 'A cobrar', cls: 'border border-line bg-canvas text-ink-light' },
  pago: { label: 'Pago', cls: 'bg-success/15 text-success' },
}
const ORDEM: Record<VisitanteStatus['status'], number> = {
  inadimplente: 0,
  a_cobrar: 1,
  enviado: 2,
  pago: 3,
}

function dataBR(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export function VisitantesView() {
  const [lista, setLista] = useState<VisitanteStatus[]>([])
  const [carregando, setCarregando] = useState(true)
  const [cobrando, setCobrando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [aberto, setAberto] = useState<string | null>(null)
  const [editar, setEditar] = useState<ContaRow | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const r = await api<VisitanteStatus[]>('/contas/visitantes')
      r.sort((a, b) => ORDEM[a.status] - ORDEM[b.status] || a.nome.localeCompare(b.nome))
      setLista(r)
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) setMsg('Erro ao carregar visitantes.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function cobrar() {
    setCobrando(true)
    setMsg(null)
    try {
      const r = await api<{ cobrados: number; pulados: number; semCadastro: number }>(
        '/contas/cobrar-visitantes',
        { method: 'POST' },
      )
      const partes = [`${r.cobrados} cobrado(s)`]
      if (r.pulados) partes.push(`${r.pulados} já enviado(s)`)
      if (r.semCadastro) partes.push(`${r.semCadastro} sem cadastro`)
      setMsg(partes.join(' · '))
      await carregar()
    } catch {
      setMsg('Erro ao cobrar visitantes.')
    } finally {
      setCobrando(false)
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button className="text-sm" onClick={cobrar} disabled={cobrando}>
          {cobrando ? 'Cobrando…' : 'Cobrar visitantes'}
        </Button>
        <Button variant="secondary" className="text-sm" onClick={carregar} disabled={carregando}>
          Atualizar
        </Button>
        {msg && <span className="text-sm font-semibold text-ink">{msg}</span>}
      </div>

      {carregando && lista.length === 0 ? (
        <p className="text-ink-muted">Carregando…</p>
      ) : lista.length === 0 ? (
        <p className="text-ink-light">Nenhum visitante.</p>
      ) : (
        <div className="space-y-2">
          {lista.map((v) => {
            const b = BADGE[v.status]
            const expandido = aberto === v.id
            return (
              <div key={v.id} className="rounded-lg border border-line bg-surface p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{v.nome}</p>
                    <p className="text-xs text-ink-light">{v.whatsapp ?? 'sem WhatsApp'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${b.cls}`}>
                      {b.label}
                    </span>
                    <span className="w-20 text-right font-bold text-ink">{formatBRL(v.saldoCents)}</span>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      setEditar({
                        id: v.id,
                        nome: v.nome,
                        tipo: 'visitante',
                        descontoPct: '0',
                        ativa: v.ativa,
                        createdAt: '',
                        titularNome: v.nome,
                        titularCpf: v.titularCpf,
                        titularWhatsapp: v.whatsapp,
                      })
                    }
                    className="text-xs font-semibold text-brand"
                  >
                    editar
                  </button>
                  {v.itensAbertos.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setAberto(expandido ? null : v.id)}
                      className="text-xs font-semibold text-brand"
                    >
                      {expandido ? 'ocultar itens' : `ver ${v.itensAbertos.length} item(ns) em aberto`}
                    </button>
                  )}
                </div>
                {expandido && (
                  <ul className="mt-2 divide-y divide-line border-t border-line pt-2 text-sm">
                    {v.itensAbertos.map((it, i) => (
                      <li key={i} className="flex justify-between py-1">
                        <span className="text-ink-muted">
                          {dataBR(it.data)} · {it.descricao ?? 'Compra'}
                        </span>
                        <span>{formatBRL(it.valorCents)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}

      {editar && (
        <ContaFormModal
          conta={editar}
          onClose={() => setEditar(null)}
          onSaved={async () => {
            setEditar(null)
            await carregar()
          }}
        />
      )}
    </div>
  )
}
