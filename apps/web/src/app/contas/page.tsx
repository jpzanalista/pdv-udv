'use client'

import { useRouter } from 'next/navigation'
import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { AppShell } from '@/components/AppShell'
import { ContaFormModal } from '@/components/contas/ContaFormModal'
import { ExtratoModal } from '@/components/contas/ExtratoModal'
import { VisitantesView } from '@/components/contas/VisitantesView'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { ApiError, api } from '@/lib/api'
import { getToken } from '@/lib/auth'
import { parseContasXlsx } from '@/lib/contas-xlsx'
import { cn } from '@/lib/utils'
import type { ContaRow } from '@/lib/types'

const ALLOWED = ['responsavel_emporio', 'admin']
const TIPO_LABEL: Record<string, string> = {
  socio: 'Sócio',
  visitante: 'Visitante',
  institucional: 'Institucional',
}
const CHIPS = [
  { id: null, label: 'Todos' },
  { id: 'socio', label: 'Sócios' },
  { id: 'visitante', label: 'Visitantes' },
  { id: 'institucional', label: 'Institucional' },
] as const

const cod = (c: number | null) => (c != null ? String(c).padStart(3, '0') : '—')

export default function ContasPage() {
  const router = useRouter()
  const [me, setMe] = useState<{ role: string; timezone: string } | null>(null)
  const [contas, setContas] = useState<ContaRow[]>([])
  const [carregando, setCarregando] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [importando, setImportando] = useState(false)
  const [form, setForm] = useState<{ conta: ContaRow | null } | null>(null)
  const [extrato, setExtrato] = useState<{ id: string; nome: string } | null>(null)
  const [tipoFiltro, setTipoFiltro] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function carregar() {
    setContas(await api<ContaRow[]>('/contas'))
  }

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tipo')
    if (t && t in TIPO_LABEL) setTipoFiltro(t)
    if (!getToken()) {
      router.replace('/login')
      return
    }
    api<{ role: string; timezone: string }>('/auth/me')
      .then((m) => {
        setMe(m)
        if (ALLOWED.includes(m.role)) return carregar()
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) router.replace('/login')
      })
      .finally(() => setCarregando(false))
  }, [router])

  function exportar() {
    const rows = visiveis.map((c) => ({
      Código: cod(c.codigo),
      Nome: c.nome,
      Tipo: TIPO_LABEL[c.tipo] ?? c.tipo,
      CPF: c.titularCpf ?? '',
      WhatsApp: c.titularWhatsapp ?? '',
      Ativa: c.ativa ? 'Sim' : 'Não',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Contas')
    XLSX.writeFile(wb, 'contas.xlsx')
  }

  async function onImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true)
    setMsg(null)
    try {
      const linhas = await parseContasXlsx(file)
      if (!linhas.length) {
        setMsg('Nenhuma linha válida na planilha.')
        return
      }
      const r = await api<{ criadas: number; atualizadas: number }>('/contas/import', {
        method: 'POST',
        body: JSON.stringify({ contas: linhas }),
      })
      setMsg(`Importado: ${r.criadas} criada(s), ${r.atualizadas} atualizada(s) — de ${linhas.length} linha(s).`)
      await carregar()
    } catch (err) {
      setMsg(err instanceof ApiError ? `Erro: ${err.message}` : 'Erro ao importar.')
    } finally {
      setImportando(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (carregando) return <main className="grid min-h-[100dvh] place-items-center text-ink-muted">Carregando…</main>
  if (me && !ALLOWED.includes(me.role))
    return (
      <AppShell title="Contas">
        <Card className="p-6 text-ink-muted">Acesso restrito ao responsável do empório.</Card>
      </AppShell>
    )

  const q = busca.trim().toLowerCase()
  const visiveis = contas
    .filter((c) => (tipoFiltro ? c.tipo === tipoFiltro : true))
    .filter((c) => (q ? c.nome.toLowerCase().includes(q) || cod(c.codigo).includes(q) : true))

  return (
    <AppShell title="Contas" fluid>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button className="text-sm" onClick={() => setForm({ conta: null })}>
          + Nova conta
        </Button>
        <Button
          variant="secondary"
          className="text-sm"
          onClick={() => fileRef.current?.click()}
          disabled={importando}
        >
          {importando ? 'Importando…' : 'Importar'}
        </Button>
        <Button variant="secondary" className="text-sm" onClick={exportar} disabled={!visiveis.length}>
          Exportar
        </Button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onImport} />
      </div>

      {/* Filtros: chips + busca */}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-1.5">
          {CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => setTipoFiltro(chip.id)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors',
                tipoFiltro === chip.id
                  ? 'border-brand bg-brand text-white'
                  : 'border-line bg-surface text-ink-muted hover:bg-canvas',
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
        {tipoFiltro !== 'visitante' && (
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou código…"
            className="sm:ml-auto sm:max-w-xs"
          />
        )}
      </div>

      {msg && <p className="mt-3 text-sm font-semibold text-ink">{msg}</p>}

      {tipoFiltro === 'visitante' ? (
        <div className="mt-4">
          <VisitantesView />
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm text-ink-muted">
            {visiveis.length} conta(s).{' '}
            <span className="text-ink-light">Toque no nome para ver o extrato.</span>
          </p>

          {/* Desktop: tabela */}
          <Card className="mt-2 hidden overflow-hidden md:block">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-line text-left text-ink-light">
                  <th className="px-4 py-3 text-right">Cód.</th>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">CPF</th>
                  <th className="px-4 py-3">WhatsApp</th>
                  <th className="px-4 py-3">Ativa</th>
                  <th className="px-4 py-3 text-right">Editar</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-line/60 last:border-0 even:bg-brand-bg/40 hover:bg-brand-bg/70"
                  >
                    <td className="px-4 py-3 text-right font-mono text-ink-muted">{cod(c.codigo)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setExtrato({ id: c.id, nome: c.nome })}
                        className="text-left font-semibold text-ink hover:text-brand hover:underline"
                      >
                        {c.nome}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{TIPO_LABEL[c.tipo] ?? c.tipo}</td>
                    <td className="px-4 py-3 text-ink-muted">{c.titularCpf ?? '—'}</td>
                    <td className="px-4 py-3 text-ink-muted">{c.titularWhatsapp ?? '—'}</td>
                    <td className="px-4 py-3">
                      {c.ativa ? (
                        <span className="text-success">Sim</span>
                      ) : (
                        <span className="text-ink-light">Não</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setForm({ conta: c })}
                        className="rounded-lg border border-brand/40 px-3.5 py-1.5 text-sm font-semibold text-brand hover:bg-brand-bg"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
                {visiveis.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-ink-light">
                      Nenhuma conta.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>

          {/* Mobile: cartões */}
          <div className="mt-2 grid gap-2 md:hidden">
            {visiveis.map((c) => (
              <Card key={c.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setExtrato({ id: c.id, nome: c.nome })}
                    className="min-w-0 text-left"
                  >
                    <p className="truncate font-semibold text-ink">{c.nome}</p>
                    <p className="text-sm text-ink-light">
                      <span className="font-mono">{cod(c.codigo)}</span> · {TIPO_LABEL[c.tipo] ?? c.tipo}
                      {!c.ativa && ' · inativa'}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ conta: c })}
                    className="shrink-0 rounded-lg border border-brand/40 px-3.5 py-1.5 text-sm font-semibold text-brand hover:bg-brand-bg"
                  >
                    Editar
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-ink-muted">
                  <span>CPF: {c.titularCpf ?? '—'}</span>
                  <span>WhatsApp: {c.titularWhatsapp ?? '—'}</span>
                </div>
              </Card>
            ))}
            {visiveis.length === 0 && (
              <Card className="p-6 text-center text-ink-light">Nenhuma conta.</Card>
            )}
          </div>
        </>
      )}

      {form && (
        <ContaFormModal
          conta={form.conta}
          tipoInicial={tipoFiltro ?? undefined}
          onClose={() => setForm(null)}
          onSaved={async () => {
            setForm(null)
            await carregar()
          }}
        />
      )}

      {extrato && (
        <ExtratoModal
          contaId={extrato.id}
          contaNome={extrato.nome}
          timezone={me?.timezone}
          onClose={() => setExtrato(null)}
        />
      )}
    </AppShell>
  )
}
