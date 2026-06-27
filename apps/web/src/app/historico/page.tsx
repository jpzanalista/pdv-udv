'use client'

import { formatBRL, reaisToCents } from '@pdv-udv/core'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ApiError, api } from '@/lib/api'
import { getToken } from '@/lib/auth'

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

function chip(active: boolean) {
  return `min-h-touch rounded px-3 text-sm font-semibold capitalize ${
    active ? 'bg-brand text-white' : 'border border-line bg-white text-ink-muted hover:bg-canvas'
  }`
}

export default function HistoricoPage() {
  const router = useRouter()
  const [me, setMe] = useState<{ role: string } | null>(null)
  const [movs, setMovs] = useState<Mov[]>([])
  const [carregando, setCarregando] = useState(true)
  const [tipo, setTipo] = useState<'todos' | 'sangria' | 'suprimento'>('todos')
  const [destino, setDestino] = useState<'todos' | 'tesouraria' | 'compra'>('todos')

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    api<{ role: string }>('/auth/me')
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
      movs.filter(
        (m) =>
          (tipo === 'todos' || m.tipo === tipo) && (destino === 'todos' || m.destino === destino),
      ),
    [movs, tipo, destino],
  )

  if (carregando) return <main className="p-8 text-ink-muted">Carregando…</main>
  if (me && !ALLOWED.includes(me.role))
    return (
      <main className="p-8">
        <h1 className="text-xl font-bold text-brand">Histórico</h1>
        <p className="mt-2 text-ink-muted">Acesso restrito.</p>
        <Link href="/" className="mt-2 inline-block text-brand">
          ← início
        </Link>
      </main>
    )

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand">Histórico de caixa</h1>
        <Link href="/" className="text-sm text-ink-muted">
          ← início
        </Link>
      </div>
      <p className="mt-1 text-ink-muted">Sangrias e suprimentos do empório (acesso permanente).</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(['todos', 'sangria', 'suprimento'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTipo(t)} className={chip(tipo === t)}>
            {t}
          </button>
        ))}
        <span className="mx-1 h-6 w-px bg-line" />
        {(['todos', 'tesouraria', 'compra'] as const).map((d) => (
          <button key={d} type="button" onClick={() => setDestino(d)} className={chip(destino === d)}>
            {d}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-ink-light">
              <th className="p-3">Data</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Recebedor / descrição</th>
              <th className="p-3 text-right">Valor</th>
              <th className="p-3">Situação</th>
              <th className="p-3">Recibo</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((m) => {
              const temRecibo =
                m.tipo === 'sangria' &&
                (m.destino === 'compra' || (m.destino === 'tesouraria' && m.status === 'validada'))
              return (
                <tr key={m.id} className="border-b border-line last:border-0">
                  <td className="whitespace-nowrap p-3">
                    {new Date(m.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-3 capitalize">
                    {m.tipo === 'suprimento' ? 'Suprimento' : `Sangria · ${m.destino}`}
                  </td>
                  <td className="p-3">{m.recebedor ?? m.descricao ?? '—'}</td>
                  <td className="p-3 text-right font-semibold">
                    {formatBRL(reaisToCents(Number(m.valor)))}
                  </td>
                  <td className="p-3">
                    {m.destino === 'tesouraria' ? (
                      m.status === 'validada' ? (
                        <span className="text-success">
                          ✓ {TES_LABEL[m.validadorRole ?? ''] ?? 'Validado'}
                        </span>
                      ) : (
                        <span className="text-warning">Pendente</span>
                      )
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-3">
                    {temRecibo ? (
                      <Link
                        href={`/caixa/recibo/${m.id}`}
                        target="_blank"
                        className="text-brand"
                      >
                        recibo
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              )
            })}
            {lista.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-ink-light">
                  Nada por aqui ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}
