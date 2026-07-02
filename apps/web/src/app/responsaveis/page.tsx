'use client'

import { Mail, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { ApiError, api } from '@/lib/api'
import { getToken } from '@/lib/auth'
import { cn } from '@/lib/utils'

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
    const nova = !r.ativo
    setLista((prev) => prev.map((x) => (x.id === r.id ? { ...x, ativo: nova } : x))) // otimista
    try {
      await api(`/usuarios/responsavel/${r.id}`, { method: 'PATCH', body: JSON.stringify({ ativo: nova }) })
    } catch {
      setLista((prev) => prev.map((x) => (x.id === r.id ? { ...x, ativo: !nova } : x)))
      setMsg('Não foi possível atualizar.')
    }
  }

  async function reenviar(r: Responsavel) {
    if (!r.email) return
    try {
      await api('/auth/emporio/reset', { method: 'POST', body: JSON.stringify({ email: r.email }) })
      setMsg(`Link para (re)definir a senha enviado para ${r.email}.`)
    } catch {
      setMsg('Não foi possível enviar o link.')
    }
  }

  if (carregando)
    return <main className="grid min-h-[100dvh] place-items-center text-ink-muted">Carregando…</main>
  if (me && !ALLOWED.includes(me.role))
    return (
      <AppShell title="Responsáveis">
        <Card className="p-6 text-ink-muted">Acesso restrito à direção do núcleo.</Card>
      </AppShell>
    )

  return (
    <AppShell title="Responsáveis">
      <div className="mx-auto max-w-2xl">
        <div className="border-b border-line pb-4">
          <h1 className="text-2xl font-bold text-ink">Responsáveis do empório</h1>
          <p className="mt-1 text-base text-ink-muted">
            Cadastre o e-mail do responsável; ele define a senha pelo link enviado.
          </p>
        </div>

        <form onSubmit={cadastrar} className="mt-4 flex gap-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@do-emporio.com"
            className="h-11 flex-1 text-base"
          />
          <Button type="submit" disabled={busy || !email.trim()} className="min-h-touch-lg">
            <UserPlus size={18} /> Cadastrar
          </Button>
        </form>
        {msg && <p className="mt-2 text-sm font-semibold text-ink">{msg}</p>}

        <div className="mt-4 space-y-2">
          {lista.map((r) => (
            <Card key={r.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{r.email}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge tom={r.temSenha ? 'ok' : 'warn'}>
                    {r.temSenha ? 'Senha definida' : 'Aguardando senha'}
                  </Badge>
                  <Badge tom={r.ativo ? 'ok' : 'off'}>{r.ativo ? 'Ativo' : 'Inativo'}</Badge>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => reenviar(r)}
                  title="Envia um link para (re)definir a senha"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand/40 px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand-bg"
                >
                  <Mail size={14} /> {r.temSenha ? 'Redefinir senha' : 'Reenviar link'}
                </button>
                <label className="flex cursor-pointer items-center gap-2">
                  <Switch checked={r.ativo} onCheckedChange={() => toggleAtivo(r)} aria-label="Ativo" />
                </label>
              </div>
            </Card>
          ))}
          {lista.length === 0 && (
            <Card className="p-6 text-center text-ink-light">Nenhum responsável cadastrado.</Card>
          )}
        </div>
      </div>
    </AppShell>
  )
}

function Badge({ tom, children }: { tom: 'ok' | 'warn' | 'off'; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
        tom === 'ok' && 'bg-success/15 text-success',
        tom === 'warn' && 'bg-warning/15 text-warning',
        tom === 'off' && 'bg-ink/10 text-ink-light',
      )}
    >
      {children}
    </span>
  )
}
