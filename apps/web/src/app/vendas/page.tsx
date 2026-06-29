'use client'

import { formatBRL } from '@pdv-udv/core'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Fragment, useEffect, useState } from 'react'
import { EnviarReciboInline } from '@/components/recibo/EnviarReciboInline'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ApiError, api } from '@/lib/api'
import { getToken } from '@/lib/auth'

const ALLOWED = ['responsavel_emporio', 'admin']
const METODO: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao_credito: 'Crédito',
  cartao_debito: 'Débito',
  conta: 'Na conta',
}
const TIPO: Record<string, string> = {
  socio: 'Sócio',
  visitante: 'Visitante',
  institucional: 'Institucional',
}

type VendaConsulta = {
  id: string
  numero: number
  data: string
  situacao: 'autorizada' | 'cancelada'
  cliente: string | null
  tipo: string | null
  descontoCents: number
  totalCents: number
  metodo: string
  reciboEnviadoEm: string | null
  telefoneSugerido: string | null
}
type ItemVenda = { descricao: string; qtde: number; unitarioCents: number; totalCents: number }

const hoje = () => new Date().toLocaleDateString('en-CA')
function diasAtras(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toLocaleDateString('en-CA')
}
function dataBR(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function VendasPage() {
  const router = useRouter()
  const [me, setMe] = useState<{ role: string } | null>(null)
  const [de, setDe] = useState(hoje())
  const [ate, setAte] = useState(hoje())
  const [situacao, setSituacao] = useState('todas')
  const [numero, setNumero] = useState('')
  const [cliente, setCliente] = useState('')
  const [vendas, setVendas] = useState<VendaConsulta[]>([])
  const [aberta, setAberta] = useState<string | null>(null)
  const [itens, setItens] = useState<Record<string, ItemVenda[]>>({})
  const [carregando, setCarregando] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)

  async function buscar() {
    setCarregando(true)
    setMsg(null)
    const q = new URLSearchParams({ de, ate })
    if (situacao !== 'todas') q.set('situacao', situacao)
    if (numero.trim()) q.set('numero', numero.trim())
    if (cliente.trim()) q.set('cliente', cliente.trim())
    try {
      setVendas(await api<VendaConsulta[]>(`/vendas/consulta?${q.toString()}`))
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) router.replace('/login')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    api<{ role: string }>('/auth/me')
      .then((m) => {
        setMe(m)
        if (ALLOWED.includes(m.role)) return buscar()
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) router.replace('/login')
      })
      .finally(() => setCarregando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function alternar(id: string) {
    if (aberta === id) {
      setAberta(null)
      return
    }
    setAberta(id)
    if (!itens[id]) {
      try {
        const its = await api<ItemVenda[]>(`/vendas/${id}/itens`)
        setItens((p) => ({ ...p, [id]: its }))
      } catch {
        // silencioso
      }
    }
  }

  function marcarReciboEnviado(id: string, enviadoEm: string) {
    setVendas((p) => p.map((v) => (v.id === id ? { ...v, reciboEnviadoEm: enviadoEm } : v)))
  }

  async function cancelar(v: VendaConsulta) {
    const motivo = window.prompt(`Cancelar a venda #${v.numero}? Informe o motivo:`)
    if (!motivo?.trim()) return
    try {
      await api(`/vendas/${v.id}/cancelar`, { method: 'POST', body: JSON.stringify({ motivo: motivo.trim() }) })
      setMsg(`Venda #${v.numero} cancelada.`)
      await buscar()
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'Erro ao cancelar.')
    }
  }

  if (carregando && !me) return <main className="p-8 text-ink-muted">Carregando…</main>
  if (me && !ALLOWED.includes(me.role))
    return (
      <main className="p-8">
        <h1 className="text-xl font-bold text-brand">Consultar vendas</h1>
        <p className="mt-2 text-ink-muted">Acesso restrito ao responsável.</p>
        <Link href="/caixa" className="mt-2 inline-block text-brand">
          ← caixa
        </Link>
      </main>
    )

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand">Consultar vendas</h1>
        <Link href="/caixa" className="text-sm text-ink-muted">
          ← caixa
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="block text-ink-light">De</span>
          <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="w-auto" />
        </label>
        <label className="text-sm">
          <span className="block text-ink-light">Até</span>
          <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="w-auto" />
        </label>
        <Button
          variant="secondary"
          className="text-sm"
          onClick={() => {
            setDe(hoje())
            setAte(hoje())
          }}
        >
          Hoje
        </Button>
        <Button
          variant="secondary"
          className="text-sm"
          onClick={() => {
            setDe(diasAtras(5))
            setAte(hoje())
          }}
        >
          Últimos 5 dias
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="block text-ink-light">Situação</span>
          <select
            value={situacao}
            onChange={(e) => setSituacao(e.target.value)}
            className="min-h-touch rounded border border-line bg-white px-2 text-ink"
          >
            <option value="todas">Todas</option>
            <option value="autorizada">Autorizada</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-ink-light">Número</span>
          <Input value={numero} onChange={(e) => setNumero(e.target.value)} className="w-24" />
        </label>
        <label className="text-sm flex-1">
          <span className="block text-ink-light">Cliente</span>
          <Input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="nome…" />
        </label>
        <Button className="text-sm" onClick={buscar} disabled={carregando}>
          {carregando ? 'Buscando…' : 'Buscar'}
        </Button>
      </div>
      {msg && <p className="mt-2 text-sm font-semibold text-ink">{msg}</p>}
      <p className="mt-2 text-ink-muted">{vendas.length} venda(s).</p>

      <div className="mt-3 overflow-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-ink-light">
              <th className="p-2">Data</th>
              <th className="p-2 text-right">Nº</th>
              <th className="p-2">Situação</th>
              <th className="p-2">Cliente</th>
              <th className="p-2">Tipo</th>
              <th className="p-2">Pagamento</th>
              <th className="p-2 text-right">Desc.</th>
              <th className="p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {vendas.map((v) => (
              <Fragment key={v.id}>
                <tr
                  onClick={() => alternar(v.id)}
                  className="cursor-pointer border-b border-line last:border-0 hover:bg-canvas"
                >
                  <td className="p-2 text-ink-muted">{dataBR(v.data)}</td>
                  <td className="p-2 text-right font-semibold">{v.numero}</td>
                  <td className="p-2">
                    {v.situacao === 'cancelada' ? (
                      <span className="text-danger">Cancelada</span>
                    ) : (
                      <span className="text-success">Autorizada</span>
                    )}
                  </td>
                  <td className="p-2">{v.cliente ?? <span className="text-ink-light">Avulso</span>}</td>
                  <td className="p-2">{v.tipo ? (TIPO[v.tipo] ?? v.tipo) : 'Avulso'}</td>
                  <td className="p-2">{METODO[v.metodo] ?? v.metodo}</td>
                  <td className="p-2 text-right">{v.descontoCents > 0 ? formatBRL(v.descontoCents) : '—'}</td>
                  <td className="p-2 text-right font-semibold">{formatBRL(v.totalCents)}</td>
                </tr>
                {aberta === v.id && (
                  <tr className="border-b border-line bg-canvas">
                    <td colSpan={8} className="p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-semibold text-ink">Itens da venda #{v.numero}</span>
                        {v.situacao === 'autorizada' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              cancelar(v)
                            }}
                            className="text-sm font-semibold text-danger"
                          >
                            Cancelar venda
                          </button>
                        )}
                      </div>
                      {!itens[v.id] ? (
                        <p className="text-sm text-ink-light">Carregando…</p>
                      ) : (
                        <ul className="divide-y divide-line text-sm">
                          {itens[v.id].map((i, idx) => (
                            <li key={idx} className="flex justify-between py-1">
                              <span>
                                {i.qtde}× {i.descricao}{' '}
                                <span className="text-ink-light">({formatBRL(i.unitarioCents)})</span>
                              </span>
                              <span className="font-semibold">{formatBRL(i.totalCents)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-3 border-t border-line pt-2">
                        <EnviarReciboInline
                          vendaId={v.id}
                          enviadoEm={v.reciboEnviadoEm}
                          telefoneSugerido={v.telefoneSugerido}
                          onEnviado={(em) => marcarReciboEnviado(v.id, em)}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {vendas.length === 0 && (
              <tr>
                <td colSpan={8} className="p-5 text-ink-light">
                  Nenhuma venda no período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}
