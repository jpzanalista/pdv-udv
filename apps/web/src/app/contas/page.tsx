'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type ChangeEvent, useRef, useState } from 'react'
import { useEffect } from 'react'
import * as XLSX from 'xlsx'
import { ContaFormModal } from '@/components/contas/ContaFormModal'
import { ExtratoModal } from '@/components/contas/ExtratoModal'
import { VisitantesView } from '@/components/contas/VisitantesView'
import { Button } from '@/components/ui/Button'
import { ApiError, api } from '@/lib/api'
import { getToken } from '@/lib/auth'
import { parseContasXlsx } from '@/lib/contas-xlsx'
import type { ContaRow } from '@/lib/types'

const ALLOWED = ['responsavel_emporio', 'admin']

const TIPO_LABEL: Record<string, string> = {
  socio: 'Sócio',
  visitante: 'Visitante',
  institucional: 'Institucional',
}

export default function ContasPage() {
  const router = useRouter()
  const [me, setMe] = useState<{ role: string } | null>(null)
  const [contas, setContas] = useState<ContaRow[]>([])
  const [carregando, setCarregando] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [importando, setImportando] = useState(false)
  const [form, setForm] = useState<{ conta: ContaRow | null } | null>(null)
  const [extrato, setExtrato] = useState<{ id: string; nome: string } | null>(null)
  const [tipoFiltro, setTipoFiltro] = useState<string | null>(null)
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
    api<{ role: string }>('/auth/me')
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
    const lista = tipoFiltro ? contas.filter((c) => c.tipo === tipoFiltro) : contas
    const rows = lista.map((c) => ({
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

  if (carregando) return <main className="p-8 text-ink-muted">Carregando…</main>
  if (me && !ALLOWED.includes(me.role))
    return (
      <main className="p-8">
        <h1 className="text-xl font-bold text-brand">Contas</h1>
        <p className="mt-2 text-ink-muted">Acesso restrito ao responsável do empório.</p>
        <Link href="/" className="mt-2 inline-block text-brand">
          ← início
        </Link>
      </main>
    )

  const visiveis = tipoFiltro ? contas.filter((c) => c.tipo === tipoFiltro) : contas
  const titulo = tipoFiltro ? `Contas · ${TIPO_LABEL[tipoFiltro]}` : 'Contas'

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand">{titulo}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button className="text-sm" onClick={() => setForm({ conta: null })}>
            Nova conta
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
          <Link href="/" className="whitespace-nowrap text-sm text-ink-muted">
            ← início
          </Link>
        </div>
      </div>
      {msg && <p className="mt-2 text-sm font-semibold text-ink">{msg}</p>}

      {tipoFiltro === 'visitante' ? (
        <div className="mt-4">
          <VisitantesView />
        </div>
      ) : (
        <>
      <p className="mt-1 text-ink-muted">
        {visiveis.length} conta(s). <span className="text-ink-light">Clique no nome para ver o extrato.</span>
      </p>

      <div className="mt-4 overflow-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-ink-light">
              <th className="p-3">Nome</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">CPF (titular)</th>
              <th className="p-3">WhatsApp</th>
              <th className="p-3">Ativa</th>
              <th className="p-3 text-right">Editar</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((c) => (
              <tr key={c.id} className="border-b border-line last:border-0">
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => setExtrato({ id: c.id, nome: c.nome })}
                    className="text-left font-semibold text-ink hover:text-brand hover:underline"
                  >
                    {c.nome}
                  </button>
                </td>
                <td className="p-3">{TIPO_LABEL[c.tipo] ?? c.tipo}</td>
                <td className="p-3">{c.titularCpf ?? '—'}</td>
                <td className="p-3">{c.titularWhatsapp ?? '—'}</td>
                <td className="p-3">
                  {c.ativa ? (
                    <span className="text-success">Sim</span>
                  ) : (
                    <span className="text-ink-light">Não</span>
                  )}
                </td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => setForm({ conta: c })}
                    className="min-h-touch rounded border border-brand px-3 text-sm font-semibold text-brand hover:bg-brand-subtle"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
          onClose={() => setExtrato(null)}
        />
      )}
    </main>
  )
}
