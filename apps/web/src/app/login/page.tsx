'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Input'
import { ApiError, api } from '@/lib/api'
import { type TokenPair, setTokens } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      router.push('/')
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
      router.push('/')
    } catch {
      setErro('dev-login indisponível.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-2xl font-bold text-brand">PDV UDV</h1>
        <p className="mb-5 text-ink-muted">Empório · entrar</p>
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
        </div>
      </Card>
    </main>
  )
}
