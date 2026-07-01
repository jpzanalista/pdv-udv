'use client'

import { formatBRL } from '@pdv-udv/core'
import { CheckCircle2, FileSpreadsheet, FileText, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ApiError, api } from '@/lib/api'
import { getToken } from '@/lib/auth'
import { exportarCortePdf } from '@/lib/corte-pdf'
import { exportarCorteXlsx } from '@/lib/corte-xlsx'
import { fmtDataHora } from '@/lib/datahora'
import { cn } from '@/lib/utils'

const ALLOWED = ['responsavel_emporio', 'admin', 'tesoureiro_1', 'tesoureiro_2']
const PODE_FECHAR = ['responsavel_emporio', 'admin']

type Item = { codigo: number | null; clienteNome: string; valorCents: number }
type Previa = {
  competencia: string
  periodoDe: string
  periodoAte: string
  corteDia: number
  corteHora: string
  jaFechado: boolean
  executadoEm: string | null
  totalCents: number
  qtdSocios: number
  itens: Item[]
}
type CorteRow = {
  id: string
  competencia: string
  periodoDe: string
  periodoAte: string
  totalCents: number
  qtdSocios: number
  executadoEm: string
}

const cod = (c: number | null) => (c != null ? String(c).padStart(3, '0') : '—')

export default function CortePage() {
  const router = useRouter()
  const [me, setMe] = useState<{ role: string; timezone: string; nucleoNome: string | null } | null>(null)
  const [competencia, setCompetencia] = useState('')
  const [previa, setPrevia] = useState<Previa | null>(null)
  const [cortes, setCortes] = useState<CorteRow[]>([])
  const [carregando, setCarregando] = useState(true)
  const [fechando, setFechando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const podeFechar = !!me && PODE_FECHAR.includes(me.role)

  async function carregarPrevia(comp?: string) {
    const q = comp ? `?competencia=${comp}` : ''
    const p = await api<Previa>(`/cortes/previa${q}`)
    setPrevia(p)
    setCompetencia(p.competencia)
  }
  async function carregarLista() {
    setCortes(await api<CorteRow[]>('/cortes'))
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    api<{ role: string; timezone: string; nucleoNome: string | null }>('/auth/me')
      .then(async (m) => {
        setMe(m)
        if (ALLOWED.includes(m.role)) {
          await carregarPrevia()
          await carregarLista()
        }
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) router.replace('/login')
      })
      .finally(() => setCarregando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function trocarCompetencia(comp: string) {
    setMsg(null)
    try {
      await carregarPrevia(comp)
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'Erro ao carregar a prévia.')
    }
  }

  async function confirmarFechar() {
    if (!previa) return
    setFechando(true)
    setMsg(null)
    try {
      await api('/cortes/fechar', {
        method: 'POST',
        body: JSON.stringify({ competencia: previa.competencia }),
      })
      setConfirmar(false)
      setMsg(`Crediário de ${previa.competencia} fechado ✓`)
      await carregarPrevia(previa.competencia)
      await carregarLista()
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'Erro ao realizar o fechamento.')
    } finally {
      setFechando(false)
    }
  }

  function exportarPreviaPdf() {
    if (!previa) return
    exportarCortePdf({
      nucleoNome: me?.nucleoNome,
      competencia: previa.competencia,
      periodoDe: previa.periodoDe,
      periodoAte: previa.periodoAte,
      executadoEm: previa.executadoEm,
      itens: previa.itens,
      totalCents: previa.totalCents,
      qtdSocios: previa.qtdSocios,
      timezone: me?.timezone,
    })
  }

  async function exportarFechado(id: string, formato: 'xlsx' | 'pdf') {
    const d = await api<Previa>(`/cortes/${id}`)
    if (formato === 'xlsx') {
      exportarCorteXlsx(d.competencia, d.itens, d.totalCents, me?.nucleoNome ?? undefined)
    } else {
      exportarCortePdf({
        nucleoNome: me?.nucleoNome,
        competencia: d.competencia,
        periodoDe: d.periodoDe,
        periodoAte: d.periodoAte,
        executadoEm: d.executadoEm,
        itens: d.itens,
        totalCents: d.totalCents,
        qtdSocios: d.qtdSocios,
        timezone: me?.timezone,
      })
    }
  }

  if (carregando)
    return <main className="grid min-h-[100dvh] place-items-center text-ink-muted">Carregando…</main>
  if (me && !ALLOWED.includes(me.role))
    return (
      <AppShell title="Fechamento do crediário">
        <Card className="p-6 text-ink-muted">Acesso restrito.</Card>
      </AppShell>
    )

  return (
    <AppShell title="Fechamento do crediário" fluid>
      <div className="border-b border-line pb-4">
        <h1 className="text-2xl font-bold text-ink">Fechamento do crediário</h1>
        <p className="mt-1 text-base text-ink-muted">
          Prévia e fechamento mensal dos sócios para a tesouraria.
        </p>
      </div>

      {/* Competência */}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-ink-light">Competência</span>
          <input
            type="month"
            value={competencia}
            onChange={(e) => trocarCompetencia(e.target.value)}
            className="min-h-touch rounded-lg border border-line bg-surface px-3 text-base text-ink"
          />
        </label>
        {previa && (
          <p className="text-sm text-ink-light">
            Janela: {fmtDataHora(previa.periodoDe, me?.timezone)} →{' '}
            {fmtDataHora(previa.periodoAte, me?.timezone)}
          </p>
        )}
      </div>

      {msg && <p className="mt-3 text-sm font-semibold text-ink">{msg}</p>}

      {previa && (
        <Card className="mt-4 p-5">
          {/* Resumo + ações */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xl font-bold text-ink">
                {previa.qtdSocios} sócio(s) · {formatBRL(previa.totalCents)}
              </p>
              {previa.jaFechado ? (
                <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-semibold text-success">
                  <CheckCircle2 size={16} /> Fechado em{' '}
                  {previa.executadoEm ? fmtDataHora(previa.executadoEm, me?.timezone) : '—'}
                </p>
              ) : (
                <p className="mt-0.5 text-sm text-ink-light">Prévia (ainda não fechado)</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() =>
                  exportarCorteXlsx(previa.competencia, previa.itens, previa.totalCents, me?.nucleoNome ?? undefined)
                }
                disabled={previa.itens.length === 0}
              >
                <FileSpreadsheet size={16} /> Excel
              </Button>
              <Button variant="secondary" onClick={exportarPreviaPdf} disabled={previa.itens.length === 0}>
                <FileText size={16} /> PDF
              </Button>
              {podeFechar && !previa.jaFechado && (
                <Button onClick={() => setConfirmar(true)} disabled={previa.itens.length === 0}>
                  <Lock size={16} /> Realizar fechamento
                </Button>
              )}
            </div>
          </div>

          {/* Itens: tabela (desktop) */}
          <div className="mt-4 hidden max-h-96 overflow-auto rounded-lg border border-line md:block">
            <table className="w-full text-base">
              <thead className="sticky top-0 bg-canvas text-xs font-semibold uppercase tracking-wide text-ink-light">
                <tr>
                  <th className="px-3 py-2 text-left">Cód.</th>
                  <th className="px-3 py-2 text-left">Cliente</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {previa.itens.map((i, idx) => (
                  <tr key={idx} className="border-t border-line/60 even:bg-brand-bg/40">
                    <td className="px-3 py-2 font-mono text-ink-muted">{cod(i.codigo)}</td>
                    <td className="px-3 py-2 text-ink">{i.clienteNome}</td>
                    <td className="px-3 py-2 text-right font-semibold text-ink">{formatBRL(i.valorCents)}</td>
                  </tr>
                ))}
                {previa.itens.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-ink-light">
                      Nenhum sócio com saldo no período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Itens: cartões (mobile) */}
          <div className="mt-4 space-y-1.5 md:hidden">
            {previa.itens.map((i, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 rounded-lg border border-line/60 px-3 py-2"
              >
                <span className="min-w-0">
                  <span className="mr-2 font-mono text-xs text-ink-light">{cod(i.codigo)}</span>
                  <span className="text-ink">{i.clienteNome}</span>
                </span>
                <span className="shrink-0 font-semibold text-ink">{formatBRL(i.valorCents)}</span>
              </div>
            ))}
            {previa.itens.length === 0 && (
              <p className="py-4 text-center text-ink-light">Nenhum sócio com saldo no período.</p>
            )}
          </div>
        </Card>
      )}

      {/* Fechamentos anteriores */}
      <section className="mt-8">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-light">
          Fechamentos anteriores
        </h2>
        {cortes.length === 0 ? (
          <p className="text-sm text-ink-light">Nenhum fechamento ainda.</p>
        ) : (
          <>
            {/* Desktop */}
            <Card className="hidden overflow-hidden md:block">
              <table className="w-full text-base">
                <thead>
                  <tr className="border-b border-line bg-canvas text-center text-xs font-semibold uppercase tracking-wide text-ink-light">
                    <th className="px-3 py-2.5 text-left">Competência</th>
                    <th className="px-3 py-2.5 text-right">Sócios</th>
                    <th className="px-3 py-2.5 text-right">Total</th>
                    <th className="px-3 py-2.5 text-left">Fechado em</th>
                    <th className="px-3 py-2.5">Planilhas</th>
                  </tr>
                </thead>
                <tbody>
                  {cortes.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-line/60 last:border-0 even:bg-brand-bg/40 hover:bg-brand-bg/70"
                    >
                      <td className="px-3 py-3 font-semibold text-ink">{c.competencia}</td>
                      <td className="px-3 py-3 text-right text-ink-muted">{c.qtdSocios}</td>
                      <td className="px-3 py-3 text-right font-semibold text-ink">{formatBRL(c.totalCents)}</td>
                      <td className="px-3 py-3 text-ink-muted">{fmtDataHora(c.executadoEm, me?.timezone)}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <BotaoExport onClick={() => exportarFechado(c.id, 'xlsx')} tipo="xlsx" />
                          <BotaoExport onClick={() => exportarFechado(c.id, 'pdf')} tipo="pdf" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Mobile */}
            <div className="grid gap-2 md:hidden">
              {cortes.map((c) => (
                <Card key={c.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-ink">{c.competencia}</p>
                      <p className="mt-0.5 text-sm text-ink-light">
                        {c.qtdSocios} sócio(s) · {fmtDataHora(c.executadoEm, me?.timezone)}
                      </p>
                    </div>
                    <span className="shrink-0 font-bold text-ink">{formatBRL(c.totalCents)}</span>
                  </div>
                  <div className="mt-2 flex gap-2 border-t border-line/60 pt-2">
                    <BotaoExport onClick={() => exportarFechado(c.id, 'xlsx')} tipo="xlsx" />
                    <BotaoExport onClick={() => exportarFechado(c.id, 'pdf')} tipo="pdf" />
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </section>

      {confirmar && previa && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !fechando && setConfirmar(false)}
        >
          <Card className="w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-ink">Fechar o crediário de {previa.competencia}?</h2>
            <p className="mt-2 text-sm text-ink-muted">
              Isto <strong>baixa o saldo</strong> de {previa.qtdSocios} sócio(s) — total{' '}
              <strong>{formatBRL(previa.totalCents)}</strong> — e transfere à tesouraria. Para o
              empório, ficam como pagos.
            </p>
            <p className="mt-2 rounded-lg bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
              ⚠️ Esta ação é irreversível pelo sistema.
            </p>
            <p className="mt-3 text-sm text-ink-light">
              Fechamento configurado: <strong>dia {previa.corteDia}</strong> às{' '}
              <strong>{previa.corteHora}</strong> (fuso do núcleo).
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setConfirmar(false)} disabled={fechando}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={confirmarFechar} disabled={fechando}>
                {fechando ? 'Fechando…' : 'Confirmar fechamento'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  )
}

function BotaoExport({ onClick, tipo }: { onClick: () => void; tipo: 'xlsx' | 'pdf' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-ink-muted hover:border-brand hover:text-brand',
      )}
    >
      {tipo === 'xlsx' ? <FileSpreadsheet size={14} /> : <FileText size={14} />}
      {tipo === 'xlsx' ? 'Excel' : 'PDF'}
    </button>
  )
}
