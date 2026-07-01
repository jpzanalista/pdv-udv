'use client'

import { formatBRL } from '@pdv-udv/core'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ApiError, api } from '@/lib/api'
import { getToken } from '@/lib/auth'
import { exportarCortePdf } from '@/lib/corte-pdf'
import { exportarCorteXlsx } from '@/lib/corte-xlsx'
import { fmtDataHora } from '@/lib/datahora'

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
      await api('/cortes/fechar', { method: 'POST', body: JSON.stringify({ competencia: previa.competencia }) })
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

  if (carregando) return <main className="p-8 text-ink-muted">Carregando…</main>
  if (me && !ALLOWED.includes(me.role))
    return (
      <main className="p-8">
        <h1 className="text-xl font-bold text-brand">Fechamento do crediário</h1>
        <p className="mt-2 text-ink-muted">Acesso restrito ao responsável.</p>
        <Link href="/caixa" className="mt-2 inline-block text-brand">
          ← caixa
        </Link>
      </main>
    )

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand">Fechamento do crediário</h1>
        <Link href="/caixa" className="text-sm text-ink-muted">
          ← caixa
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block text-ink-light">Competência</span>
          <input
            type="month"
            value={competencia}
            onChange={(e) => trocarCompetencia(e.target.value)}
            className="min-h-touch rounded border border-line bg-surface px-2 text-ink"
          />
        </label>
        {previa && (
          <p className="text-sm text-ink-light">
            Janela: {fmtDataHora(previa.periodoDe, me?.timezone)} → {fmtDataHora(previa.periodoAte, me?.timezone)}
          </p>
        )}
      </div>

      {msg && <p className="mt-3 text-sm font-semibold text-ink">{msg}</p>}

      {previa && (
        <Card className="mt-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-ink">
                {previa.qtdSocios} sócio(s) — {formatBRL(previa.totalCents)}
              </p>
              {previa.jaFechado ? (
                <p className="text-sm text-success">
                  ✓ Fechado em {previa.executadoEm ? fmtDataHora(previa.executadoEm, me?.timezone) : '—'}
                </p>
              ) : (
                <p className="text-sm text-ink-light">Prévia (ainda não fechado)</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                className="text-sm"
                onClick={() => exportarCorteXlsx(previa.competencia, previa.itens, previa.totalCents, me?.nucleoNome ?? undefined)}
                disabled={previa.itens.length === 0}
              >
                Excel
              </Button>
              <Button
                variant="secondary"
                className="text-sm"
                onClick={exportarPreviaPdf}
                disabled={previa.itens.length === 0}
              >
                PDF
              </Button>
              {podeFechar && !previa.jaFechado && (
                <Button
                  className="text-sm"
                  onClick={() => setConfirmar(true)}
                  disabled={previa.itens.length === 0}
                >
                  Realizar fechamento
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 max-h-96 overflow-auto rounded border border-line">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-canvas">
                <tr className="text-left text-ink-light">
                  <th className="p-2 text-right">Cód.</th>
                  <th className="p-2">Cliente</th>
                  <th className="p-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {previa.itens.map((i, idx) => (
                  <tr key={idx} className="border-t border-line">
                    <td className="p-2 text-right font-mono text-ink-muted">
                      {i.codigo != null ? String(i.codigo).padStart(3, '0') : '—'}
                    </td>
                    <td className="p-2">{i.clienteNome}</td>
                    <td className="p-2 text-right font-semibold">{formatBRL(i.valorCents)}</td>
                  </tr>
                ))}
                {previa.itens.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-4 text-ink-light">
                      Nenhum sócio com saldo no período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-light">
          Fechamentos anteriores
        </h2>
        {cortes.length === 0 ? (
          <p className="text-sm text-ink-light">Nenhum fechamento ainda.</p>
        ) : (
          <div className="overflow-auto rounded-lg border border-line bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-light">
                  <th className="p-2">Competência</th>
                  <th className="p-2 text-right">Sócios</th>
                  <th className="p-2 text-right">Total</th>
                  <th className="p-2">Fechado em</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {cortes.map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-0">
                    <td className="p-2 font-semibold">{c.competencia}</td>
                    <td className="p-2 text-right">{c.qtdSocios}</td>
                    <td className="p-2 text-right font-semibold">{formatBRL(c.totalCents)}</td>
                    <td className="p-2 text-ink-muted">{fmtDataHora(c.executadoEm, me?.timezone)}</td>
                    <td className="p-2 text-right">
                      <button
                        type="button"
                        onClick={() => exportarFechado(c.id, 'xlsx')}
                        className="mr-3 text-sm font-semibold text-brand"
                      >
                        Excel
                      </button>
                      <button
                        type="button"
                        onClick={() => exportarFechado(c.id, 'pdf')}
                        className="text-sm font-semibold text-brand"
                      >
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            <p className="mt-2 rounded bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
              ⚠️ Esta ação é irreversível pelo sistema.
            </p>
            <p className="mt-3 text-sm text-ink-light">
              Fechamento configurado: <strong>dia {previa.corteDia}</strong> às{' '}
              <strong>{previa.corteHora}</strong> (fuso do núcleo).
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setConfirmar(false)}
                disabled={fechando}
              >
                Cancelar
              </Button>
              <Button className="flex-1" onClick={confirmarFechar} disabled={fechando}>
                {fechando ? 'Fechando…' : 'Confirmar fechamento'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </main>
  )
}
