'use client'

import { formatBRL, reaisToCents } from '@pdv-udv/core'
import { Download, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { AppShell } from '@/components/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ApiError, api } from '@/lib/api'
import { getToken } from '@/lib/auth'
import { fmtDataHora } from '@/lib/datahora'
import { cn } from '@/lib/utils'

type Mov = {
  id: string
  tipo: 'sangria' | 'suprimento'
  destino: 'tesouraria' | 'compra' | null
  valor: string
  descricao: string | null
  recebedor: string | null
  status: string | null
  validadoEm: string | null
  validadorRole: string | null
  createdAt: string
}

const ALLOWED = ['tesoureiro_1', 'tesoureiro_2', 'responsavel_emporio', 'presidencia', 'admin']
const TES_LABEL: Record<string, string> = {
  tesoureiro_1: '1º Tesoureiro',
  tesoureiro_2: '2º Tesoureiro',
  admin: 'Admin',
}

const brl = (v: unknown) => formatBRL(reaisToCents(Number(v)))
const tipoLabel = (m: Mov) => (m.tipo === 'suprimento' ? 'Suprimento' : `Sangria · ${m.destino ?? ''}`)
const temRecibo = (m: Mov) =>
  m.tipo === 'sangria' && (m.destino === 'compra' || (m.destino === 'tesouraria' && m.status === 'validada'))

export default function HistoricoPage() {
  const router = useRouter()
  const [me, setMe] = useState<{ role: string; timezone: string } | null>(null)
  const [movs, setMovs] = useState<Mov[]>([])
  const [carregando, setCarregando] = useState(true)
  const [tipo, setTipo] = useState<'todos' | 'sangria' | 'suprimento'>('todos')
  const [destino, setDestino] = useState<'todos' | 'tesouraria' | 'compra'>('todos')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    api<{ role: string; timezone: string }>('/auth/me')
      .then((m) => {
        setMe(m)
        if (ALLOWED.includes(m.role))
          return api<Mov[]>('/expedientes/movimentos/historico').then(setMovs)
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) router.replace('/login')
      })
      .finally(() => setCarregando(false))
  }, [router])

  const lista = useMemo(
    () =>
      movs.filter((m) => {
        if (tipo !== 'todos' && m.tipo !== tipo) return false
        if (destino !== 'todos' && m.destino !== destino) return false
        const dia = new Date(m.createdAt)
        if (de && dia < new Date(`${de}T00:00:00`)) return false
        if (ate && dia > new Date(`${ate}T23:59:59`)) return false
        return true
      }),
    [movs, tipo, destino, de, ate],
  )

  const total = useMemo(
    () =>
      lista.reduce((s, m) => s + Number(m.valor) * (m.tipo === 'suprimento' ? 1 : -1), 0),
    [lista],
  )

  function exportar() {
    const rows = lista.map((m) => ({
      Data: fmtDataHora(m.createdAt, me?.timezone),
      Tipo: m.tipo === 'suprimento' ? 'Suprimento' : 'Sangria',
      Destino: m.destino ?? '',
      'Fornecedor/Recebedor': m.recebedor ?? '',
      Descrição: m.descricao ?? '',
      Valor: Number(m.valor),
      Situação:
        m.destino === 'tesouraria'
          ? m.status === 'validada'
            ? `Validado (${TES_LABEL[m.validadorRole ?? ''] ?? ''})`
            : 'Pendente'
          : '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Histórico')
    XLSX.writeFile(wb, 'historico-caixa.xlsx')
  }

  if (carregando)
    return <main className="grid min-h-[100dvh] place-items-center text-ink-muted">Carregando…</main>
  if (me && !ALLOWED.includes(me.role))
    return (
      <AppShell title="Histórico">
        <Card className="p-6 text-ink-muted">Acesso restrito.</Card>
      </AppShell>
    )

  return (
    <AppShell title="Histórico" fluid>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-muted">Sangrias e suprimentos do empório (acesso permanente).</p>
        <Button variant="secondary" onClick={exportar} disabled={lista.length === 0}>
          <Download size={16} /> Exportar Excel
        </Button>
      </div>

      {/* Filtros: chips */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {(['todos', 'sangria', 'suprimento'] as const).map((t) => (
          <Chip key={t} active={tipo === t} onClick={() => setTipo(t)}>
            {t === 'todos' ? 'Todos' : t === 'sangria' ? 'Sangria' : 'Suprimento'}
          </Chip>
        ))}
        <span className="mx-1 h-6 w-px bg-line" />
        {(['todos', 'tesouraria', 'compra'] as const).map((d) => (
          <Chip key={d} active={destino === d} onClick={() => setDestino(d)}>
            {d === 'todos' ? 'Todo destino' : d === 'tesouraria' ? 'Tesouraria' : 'Compra'}
          </Chip>
        ))}
      </div>

      {/* Filtros: datas */}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
        <span>De</span>
        <input
          type="date"
          value={de}
          onChange={(e) => setDe(e.target.value)}
          className="min-h-touch rounded-lg border border-line bg-surface px-3 text-ink"
        />
        <span>até</span>
        <input
          type="date"
          value={ate}
          onChange={(e) => setAte(e.target.value)}
          className="min-h-touch rounded-lg border border-line bg-surface px-3 text-ink"
        />
        {(de || ate) && (
          <button
            type="button"
            onClick={() => {
              setDe('')
              setAte('')
            }}
            className="font-semibold text-brand hover:underline"
          >
            limpar
          </button>
        )}
        <span className="ml-auto flex items-center gap-2 text-ink-light">
          <span>{lista.length} registro(s)</span>
          <span>·</span>
          <span>
            Saldo:{' '}
            <strong className={cn(total < 0 ? 'text-danger' : 'text-success')}>{brl(total)}</strong>
          </span>
        </span>
      </div>

      {/* Desktop: tabela */}
      <Card className="mt-3 hidden overflow-hidden md:block">
        <table className="w-full text-base">
          <thead>
            <tr className="border-b border-line bg-canvas text-center text-xs font-semibold uppercase tracking-wide text-ink-light">
              <th className="px-3 py-2.5 text-left">Data</th>
              <th className="px-3 py-2.5">Tipo</th>
              <th className="px-3 py-2.5 text-left">Recebedor / descrição</th>
              <th className="px-3 py-2.5 text-right">Valor</th>
              <th className="px-3 py-2.5">Situação</th>
              <th className="px-3 py-2.5">Recibo</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((m) => (
              <tr
                key={m.id}
                className="border-b border-line/60 text-center last:border-0 even:bg-brand-bg/40 hover:bg-brand-bg/70"
              >
                <td className="whitespace-nowrap px-3 py-3 text-left text-ink-muted">
                  {fmtDataHora(m.createdAt, me?.timezone)}
                </td>
                <td className="px-3 py-3 text-ink">{tipoLabel(m)}</td>
                <td className="px-3 py-3 text-left text-ink">{m.recebedor ?? m.descricao ?? '—'}</td>
                <td
                  className={cn(
                    'px-3 py-3 text-right font-semibold',
                    m.tipo === 'suprimento' ? 'text-success' : 'text-ink',
                  )}
                >
                  {m.tipo === 'suprimento' ? '+' : '−'}
                  {brl(m.valor)}
                </td>
                <td className="px-3 py-3">
                  <SituacaoBadge m={m} />
                </td>
                <td className="px-3 py-3">
                  {temRecibo(m) ? (
                    <Link
                      href={`/caixa/recibo/${m.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
                    >
                      <ExternalLink size={14} /> Recibo
                    </Link>
                  ) : (
                    <span className="text-ink-light">—</span>
                  )}
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-ink-light">
                  Nada por aqui ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Mobile: cartões */}
      <div className="mt-3 grid gap-2 md:hidden">
        {lista.map((m) => (
          <Card key={m.id} className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-ink">{tipoLabel(m)}</p>
                <p className="mt-0.5 text-sm text-ink-light">{fmtDataHora(m.createdAt, me?.timezone)}</p>
              </div>
              <span
                className={cn(
                  'shrink-0 text-lg font-extrabold',
                  m.tipo === 'suprimento' ? 'text-success' : 'text-ink',
                )}
              >
                {m.tipo === 'suprimento' ? '+' : '−'}
                {brl(m.valor)}
              </span>
            </div>
            {(m.recebedor || m.descricao) && (
              <p className="mt-1 text-sm text-ink-muted">{m.recebedor ?? m.descricao}</p>
            )}
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-line/60 pt-2">
              <SituacaoBadge m={m} />
              {temRecibo(m) ? (
                <Link
                  href={`/caixa/recibo/${m.id}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-brand"
                >
                  <ExternalLink size={14} /> Recibo
                </Link>
              ) : (
                <span className="text-sm text-ink-light">—</span>
              )}
            </div>
          </Card>
        ))}
        {lista.length === 0 && <Card className="p-6 text-center text-ink-light">Nada por aqui ainda.</Card>}
      </div>
    </AppShell>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'min-h-touch rounded-full border px-3.5 text-sm font-semibold transition-colors',
        active
          ? 'border-brand bg-brand text-white'
          : 'border-line bg-surface text-ink-muted hover:bg-canvas',
      )}
    >
      {children}
    </button>
  )
}

function SituacaoBadge({ m }: { m: Mov }) {
  if (m.destino !== 'tesouraria') return <span className="text-ink-light">—</span>
  const ok = m.status === 'validada'
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
        ok ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning',
      )}
    >
      {ok ? `✓ ${TES_LABEL[m.validadorRole ?? ''] ?? 'Validado'}` : 'Pendente'}
    </span>
  )
}
