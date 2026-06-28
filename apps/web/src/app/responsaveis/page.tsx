'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { ApiError, api } from '@/lib/api'
import { getToken } from '@/lib/auth'

const ALLOWED = ['presidencia', 'representante_nucleo', 'admin']

type Responsavel = { id: string; email: string | null; ativo: boolean; temSenha: boolean }

export default function ResponsaveisPage() {
  const router = useRouter()
  const [me, setMe] = useState<{ role: string } | null>(null)
  const [lista, setLista] = useState<Responsavel[]>([])
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [busy, setBusy] = useState(false)

  async function carregar() {
    setLista(await api<Responsavel[]>('/usuarios/responsaveis'))
  }

  useEffect(() => {
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

  async function cadastrar(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    setMsg(null)
    try {
      await api('/usuarios/responsavel', { method: 'POST', body: JSON.stringify({ email: email.trim() }) })
      setMsg('Responsável cadastrado — enviamos o link para definir a senha.')
      setEmail('')
      await carregar()
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Erro ao cadastrar.')
    } finally {
      setBusy(false)
    }
  }

  async function toggleAtivo(r: Responsavel) {
    try {
      await api(`/usuarios/responsavel/${r.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ativo: !r.ativo }),
      })
      await carregar()
    } catch {
      setMsg('Não foi possível atualizar.')
    }
  }

  async function reenviar(r: Responsavel) {
    if (!r.email) return
    try {
      await api('/auth/emporio/reset', { method: 'POST', body: JSON.stringify({ email: r.email }) })
      setMsg(`Link de senha reenviado para ${r.email}.`)
    } catch {
      setMsg('Não foi possível reenviar.')
    }
  }

  if (carregando) return <main className="p-8 text-ink-muted">Carregando…</main>
  if (me && !ALLOWED.includes(me.role))
    return (
      <main className="p-8">
        <h1 className="text-xl font-bold text-brand">Responsáveis</h1>
        <p className="mt-2 text-ink-muted">Acesso restrito à direção do núcleo.</p>
        <Link href="/" className="mt-2 inline-block text-brand">
          ← início
        </Link>
      </main>
    )

  return (
    <main className="mx-auto max-w-xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand">Responsáveis do empório</h1>
        <Link href="/relatorios" className="text-sm text-ink-muted">
          ← relatórios
        </Link>
      </div>
      <p className="mt-1 text-ink-muted">Cadastre o e-mail do responsável; ele define a senha pelo link.</p>

      <form onSubmit={cadastrar} className="mt-4 flex gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@do-emporio.com"
        />
        <Button type="submit" disabled={busy || !email.trim()}>
          Cadastrar
        </Button>
      </form>
      {msg && <p className="mt-2 text-sm font-semibold text-ink">{msg}</p>}

      <div className="mt-4 space-y-2">
        {lista.map((r) => (
          <Card key={r.id} className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{r.email}</p>
              <p className="text-xs text-ink-light">
                {r.temSenha ? 'senha definida' : 'aguardando definir senha'} ·{' '}
                {r.ativo ? <span className="text-success">ativo</span> : <span className="text-danger">inativo</span>}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {!r.temSenha && (
                <button type="button" onClick={() => reenviar(r)} className="text-sm text-brand">
                  reenviar link
                </button>
              )}
              <button
                type="button"
                onClick={() => toggleAtivo(r)}
                className={`text-sm font-semibold ${r.ativo ? 'text-danger' : 'text-success'}`}
              >
                {r.ativo ? 'desativar' : 'ativar'}
              </button>
            </div>
          </Card>
        ))}
        {lista.length === 0 && <Card className="p-5 text-ink-light">Nenhum responsável cadastrado.</Card>}
      </div>
    </main>
  )
}
