'use client'

import { formatBRL } from '@pdv-udv/core'
import { ChevronDown, Download, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Fragment, useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { AppShell } from '@/components/AppShell'
import { EnviarReciboInline } from '@/components/recibo/EnviarReciboInline'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { ApiError, api } from '@/lib/api'
import { getToken } from '@/lib/auth'
import { fmtDataHora } from '@/lib/datahora'
import { cn } from '@/lib/utils'

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

export default function VendasPage() {
  const router = useRouter()
  const [me, setMe] = useState<{ role: string; timezone: string } | null>(null)
  const [de, setDe] = useState(hoje())
  const [ate, setAte] = useState(hoje())
  const [situacao, setSituacao] = useState('todas')
  const [tipoFiltro, setTipoFiltro] = useState('') // '' = todos; 'avulso' = sem conta
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
      setAberta(null)
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
    api<{ role: string; timezone: string }>('/auth/me')
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

  const visiveis = useMemo(() => {
    if (!tipoFiltro) return vendas
    return vendas.filter((v) => (tipoFiltro === 'avulso' ? v.tipo == null : v.tipo === tipoFiltro))
  }, [vendas, tipoFiltro])

  const totalPeriodo = useMemo(
    () => visiveis.filter((v) => v.situacao === 'autorizada').reduce((s, v) => s + v.totalCents, 0),
    [visiveis],
  )

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
      await api(`/vendas/${v.id}/cancelar`, {
        method: 'POST',
        body: JSON.stringify({ motivo: motivo.trim() }),
      })
      setMsg(`Venda #${v.numero} cancelada.`)
      await buscar()
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'Erro ao cancelar.')
    }
  }

  function exportar() {
    const rows = visiveis.map((v) => ({
      Data: fmtDataHora(v.data, me?.timezone),
      Número: v.numero,
      Situação: v.situacao === 'cancelada' ? 'Cancelada' : 'Autorizada',
      Cliente: v.cliente ?? 'Avulso',
      Tipo: v.tipo ? (TIPO[v.tipo] ?? v.tipo) : 'Avulso',
      Pagamento: METODO[v.metodo] ?? v.metodo,
      Desconto: v.descontoCents / 100,
      Total: v.totalCents / 100,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Vendas')
    XLSX.writeFile(wb, `vendas_${de}_a_${ate}.xlsx`)
  }

  function detalhes(v: VendaConsulta) {
    return (
      <>
        <div className="mb-2 flex items-center justify-between">
          <span className="font-semibold text-ink">Itens da venda #{v.numero}</span>
          {v.situacao === 'autorizada' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                cancelar(v)
              }}
              className="text-sm font-semibold text-danger hover:underline"
            >
              Cancelar venda
            </button>
          )}
        </div>
        {!itens[v.id] ? (
          <p className="text-sm text-ink-light">Carregando…</p>
        ) : (
          <ul className="divide-y divide-line/60 text-sm">
            {itens[v.id].map((i, idx) => (
              <li key={idx} className="flex justify-between gap-2 py-1.5">
                <span className="text-ink">
                  {i.qtde}× {i.descricao}{' '}
                  <span className="text-ink-light">({formatBRL(i.unitarioCents)})</span>
                </span>
                <span className="font-semibold text-ink">{formatBRL(i.totalCents)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 border-t border-line pt-2">
          <EnviarReciboInline
            vendaId={v.id}
            enviadoEm={v.reciboEnviadoEm}
            telefoneSugerido={v.telefoneSugerido}
            timezone={me?.timezone}
            onEnviado={(em) => marcarReciboEnviado(v.id, em)}
          />
        </div>
      </>
    )
  }

  if (carregando && !me)
    return <main className="grid min-h-[100dvh] place-items-center text-ink-muted">Carregando…</main>
  if (me && !ALLOWED.includes(me.role))
    return (
      <AppShell title="Consultar vendas">
        <Card className="p-6 text-ink-muted">Acesso restrito ao responsável.</Card>
      </AppShell>
    )

  return (
    <AppShell title="Consultar vendas" fluid>
      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Campo label="De">
            <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="w-40" />
          </Campo>
          <Campo label="Até">
            <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="w-40" />
          </Campo>
          <Button
            variant="secondary"
            onClick={() => {
              setDe(hoje())
              setAte(hoje())
            }}
          >
            Hoje
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setDe(diasAtras(5))
              setAte(hoje())
            }}
          >
            Últimos 5 dias
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Campo label="Situação">
            <Select value={situacao} onChange={setSituacao}>
              <option value="todas">Todas</option>
              <option value="autorizada">Autorizada</option>
              <option value="cancelada">Cancelada</option>
            </Select>
          </Campo>
          <Campo label="Tipo">
            <Select value={tipoFiltro} onChange={setTipoFiltro}>
              <option value="">Todos</option>
              <option value="socio">Sócio</option>
              <option value="visitante">Visitante</option>
              <option value="institucional">Institucional</option>
              <option value="avulso">Avulso</option>
            </Select>
          </Campo>
          <Campo label="Número">
            <Input value={numero} onChange={(e) => setNumero(e.target.value)} className="w-24" />
          </Campo>
          <Campo label="Cliente" className="min-w-[12rem] flex-1">
            <Input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="nome…" />
          </Campo>
          <Button onClick={buscar} disabled={carregando}>
            <Search size={16} /> {carregando ? 'Buscando…' : 'Buscar'}
          </Button>
          <Button variant="secondary" onClick={exportar} disabled={!visiveis.length}>
            <Download size={16} /> Exportar
          </Button>
        </div>
      </Card>

      {msg && <p className="mt-3 text-sm font-semibold text-ink">{msg}</p>}
      <p className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
        <span>{visiveis.length} venda(s).</span>
        <span className="text-ink-light">Toque numa linha para ver os itens.</span>
        <span className="sm:ml-auto">
          Total autorizado: <strong className="text-ink">{formatBRL(totalPeriodo)}</strong>
        </span>
      </p>

      {/* Desktop: tabela */}
      <Card className="mt-2 hidden overflow-hidden md:block">
        <table className="w-full text-base">
          <thead>
            <tr className="border-b border-line bg-canvas text-center text-xs font-semibold uppercase tracking-wide text-ink-light">
              <th className="px-3 py-2.5 text-left">Data</th>
              <th className="px-3 py-2.5">Nº</th>
              <th className="px-3 py-2.5">Situação</th>
              <th className="px-3 py-2.5 text-left">Cliente</th>
              <th className="px-3 py-2.5">Tipo</th>
              <th className="px-3 py-2.5">Pagamento</th>
              <th className="px-3 py-2.5 text-right">Desc.</th>
              <th className="px-3 py-2.5 text-right">Total</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {visiveis.map((v) => (
              <Fragment key={v.id}>
                <tr
                  onClick={() => alternar(v.id)}
                  className="cursor-pointer border-b border-line/60 text-center last:border-0 even:bg-brand-bg/40 hover:bg-brand-bg/70"
                >
                  <td className="px-3 py-3 text-left text-ink-muted">{fmtDataHora(v.data, me?.timezone)}</td>
                  <td className="px-3 py-3 font-semibold text-ink">{v.numero}</td>
                  <td className="px-3 py-3">
                    <SituacaoBadge s={v.situacao} />
                  </td>
                  <td className="px-3 py-3 text-left text-ink">
                    {v.cliente ?? <span className="text-ink-light">Avulso</span>}
                  </td>
                  <td className="px-3 py-3 text-ink-muted">{v.tipo ? (TIPO[v.tipo] ?? v.tipo) : 'Avulso'}</td>
                  <td className="px-3 py-3 text-ink-muted">{METODO[v.metodo] ?? v.metodo}</td>
                  <td className="px-3 py-3 text-right text-ink-muted">
                    {v.descontoCents > 0 ? formatBRL(v.descontoCents) : '—'}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-ink">{formatBRL(v.totalCents)}</td>
                  <td className="px-2 py-3 text-ink-light">
                    <ChevronDown
                      size={16}
                      className={cn('transition-transform', aberta === v.id && 'rotate-180')}
                    />
                  </td>
                </tr>
                {aberta === v.id && (
                  <tr className="bg-canvas">
                    <td colSpan={9} className="px-4 py-3">
                      {detalhes(v)}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {visiveis.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-ink-light">
                  Nenhuma venda no período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Mobile: cartões */}
      <div className="mt-2 grid gap-2 md:hidden">
        {visiveis.map((v) => (
          <Card key={v.id} className="overflow-hidden">
            <button
              type="button"
              onClick={() => alternar(v.id)}
              className="flex w-full items-center gap-2 p-3 text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-ink">#{v.numero}</span>
                  <SituacaoBadge s={v.situacao} />
                  <span className="text-xs text-ink-light">{fmtDataHora(v.data, me?.timezone)}</span>
                </div>
                <p className="mt-0.5 truncate text-sm text-ink-muted">
                  {v.cliente ?? 'Avulso'} · {METODO[v.metodo] ?? v.metodo}
                </p>
              </div>
              <span className="shrink-0 font-bold text-ink">{formatBRL(v.totalCents)}</span>
              <ChevronDown
                size={18}
                className={cn('shrink-0 text-ink-light transition-transform', aberta === v.id && 'rotate-180')}
              />
            </button>
            {aberta === v.id && <div className="border-t border-line bg-canvas px-3 py-3">{detalhes(v)}</div>}
          </Card>
        ))}
        {visiveis.length === 0 && (
          <Card className="p-6 text-center text-ink-light">Nenhuma venda no período.</Card>
        )}
      </div>
    </AppShell>
  )
}

function Campo({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cn('flex flex-col gap-1 text-sm', className)}>
      <span className="font-semibold text-ink-light">{label}</span>
      {children}
    </label>
  )
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="min-h-touch rounded-lg border border-line bg-surface px-3 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
    >
      {children}
    </select>
  )
}

function SituacaoBadge({ s }: { s: 'autorizada' | 'cancelada' }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
        s === 'cancelada' ? 'bg-danger/15 text-danger' : 'bg-success/15 text-success',
      )}
    >
      {s === 'cancelada' ? 'Cancelada' : 'Autorizada'}
    </span>
  )
}
