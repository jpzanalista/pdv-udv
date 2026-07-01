'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'
import { ApiError, api } from '@/lib/api'
import { type TokenPair, setTokens } from '@/lib/auth'
import { landingFor } from '@/lib/nav'

async function irParaArea(replace: (href: string) => void) {
  const me = await api<{ role: string }>('/auth/me')
  replace(landingFor(me.role))
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [devEmail, setDevEmail] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setLoading(true)
    try {
      const t = await api<TokenPair>('/auth/login', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ email, password }),
      })
      setTokens(t)
      await irParaArea((href) => router.replace(href))
    } catch (err) {
      if (err instanceof ApiError && err.status === 403)
        setErro('Sua conta não tem cargo autorizado para o empório.')
      else if (err instanceof ApiError && err.status === 401) setErro('E-mail ou senha incorretos.')
      else setErro('Não foi possível entrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function devEntrar(devEmail: string) {
    setErro(null)
    setLoading(true)
    try {
      const t = await api<TokenPair>('/auth/dev-login', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ email: devEmail }),
      })
      setTokens(t)
      await irParaArea((href) => router.replace(href))
    } catch {
      setErro('dev-login indisponível.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-5 flex items-center gap-3">
          <Logo size={44} />
          <div>
            <h1 className="text-2xl font-bold leading-none text-brand">Empório</h1>
            <p className="mt-1 text-ink-muted">Entrar</p>
          </div>
        </div>
        <form onSubmit={entrar} className="flex flex-col gap-4">
          <Field label="E-mail" htmlFor="email">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </Field>
          <Field label="Senha" htmlFor="senha">
            <Input
              id="senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          {erro && <p className="text-sm text-danger">{erro}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        <div className="mt-4 flex flex-col gap-1 text-center">
          <a href="/login/emporio" className="text-sm font-semibold text-brand">
            Responsável do empório? Entrar →
          </a>
          <a href="/portal/login" className="text-sm font-semibold text-brand">
            É sócio? Entrar pelo CPF →
          </a>
        </div>

        <div className="mt-6 border-t border-line pt-4">
          <p className="mb-2 text-xs text-ink-light">Atalhos de desenvolvimento:</p>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="ghost"
              className="text-sm"
              onClick={() => devEntrar('caixa@pdv.local')}
              disabled={loading}
            >
              Dev: caixa
            </Button>
            <Button
              variant="ghost"
              className="text-sm"
              onClick={() => devEntrar('tesoureiro@pdv.local')}
              disabled={loading}
            >
              Dev: tesoureiro
            </Button>
            <Button
              variant="ghost"
              className="text-sm"
              onClick={() => devEntrar('admin@pdv.local')}
              disabled={loading}
            >
              Dev: admin
            </Button>
          </div>
          <p className="mb-1 mt-3 text-xs text-ink-light">Diretoria · Senhora Santana:</p>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="ghost"
              className="text-sm"
              onClick={() => devEntrar('pres.senhorasantana@udv.org.br')}
              disabled={loading}
            >
              Presidente
            </Button>
            <Button
              variant="ghost"
              className="text-sm"
              onClick={() => devEntrar('repres.senhorasantana@udv.org.br')}
              disabled={loading}
            >
              Representante
            </Button>
            <Button
              variant="ghost"
              className="text-sm"
              onClick={() => devEntrar('tes.senhorasantana@udv.org.br')}
              disabled={loading}
            >
              Tesoureiro
            </Button>
          </div>
          <div className="mt-2 flex gap-2">
            <Input
              value={devEmail}
              onChange={(e) => setDevEmail(e.target.value)}
              placeholder="dev-login por e-mail (ex.: pres.senhorasantana@udv.org.br)"
              className="text-sm"
            />
            <Button
              variant="ghost"
              className="text-sm"
              onClick={() => devEntrar(devEmail.trim())}
              disabled={loading || !devEmail.trim()}
            >
              Entrar
            </Button>
          </div>
        </div>
      </Card>
    </main>
  )
}
