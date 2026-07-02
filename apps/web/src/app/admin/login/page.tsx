'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'
import { ApiError, api } from '@/lib/api'
import { type TokenPair, setTokens } from '@/lib/auth'
import { desktopAutofocus } from '@/lib/focus'

export default function GestorLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro(null)
    try {
      const t = await api<TokenPair>('/auth/gestor', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ email, senha }),
      })
      setTokens(t)
      router.replace('/admin')
    } catch (err) {
      setErro(
        err instanceof ApiError && err.status === 401
          ? 'E-mail ou senha incorretos.'
          : 'Não foi possível entrar.',
      )
    } finally {
      setCarregando(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-5 flex items-center gap-3">
          <Logo size={44} />
          <div>
            <h1 className="text-2xl font-bold leading-none text-brand">Empório</h1>
            <p className="mt-1 text-ink-muted">Plataforma · Gestor</p>
          </div>
        </div>
        <form onSubmit={entrar} className="flex flex-col gap-4">
          <Field label="E-mail" htmlFor="email">
            <Input
              id="email"
              type="email"
              ref={desktopAutofocus}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </Field>
          <Field label="Senha" htmlFor="senha">
            <Input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          {erro && <p className="text-sm font-semibold text-danger">{erro}</p>}
          <Button type="submit" disabled={carregando}>
            {carregando ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </Card>
    </main>
  )
}
