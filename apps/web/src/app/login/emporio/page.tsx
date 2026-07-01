'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'
import { ApiError, api } from '@/lib/api'
import { type TokenPair, setTokens } from '@/lib/auth'

export default function EmporioLoginPage() {
  const router = useRouter()
  const [modo, setModo] = useState<'login' | 'reset'>('login')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)
    try {
      const t = await api<TokenPair>('/auth/emporio/login', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ email: email.trim(), senha }),
      })
      setTokens(t)
      router.replace('/caixa')
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

  async function enviarReset(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)
    try {
      await api('/auth/emporio/reset', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ email: email.trim() }),
      })
      setAviso('Se o e-mail estiver cadastrado, enviamos um link para redefinir a senha.')
      setModo('login')
    } catch {
      setErro('Não foi possível enviar o link.')
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
            <p className="mt-1 text-ink-muted">Responsável</p>
          </div>
        </div>

        {aviso && <p className="mb-3 text-sm font-semibold text-success">{aviso}</p>}

        {modo === 'login' ? (
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
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
                required
              />
            </Field>
            {erro && <p className="text-sm text-danger">{erro}</p>}
            <Button type="submit" disabled={carregando}>
              {carregando ? 'Entrando…' : 'Entrar'}
            </Button>
            <button
              type="button"
              className="text-center text-sm text-brand"
              onClick={() => {
                setModo('reset')
                setErro(null)
                setAviso(null)
              }}
            >
              Esqueci a senha
            </button>
          </form>
        ) : (
          <form onSubmit={enviarReset} className="flex flex-col gap-4">
            <Field label="E-mail" htmlFor="email-reset">
              <Input
                id="email-reset"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            {erro && <p className="text-sm text-danger">{erro}</p>}
            <Button type="submit" disabled={carregando}>
              {carregando ? 'Enviando…' : 'Enviar link de redefinição'}
            </Button>
            <button
              type="button"
              className="text-center text-sm text-ink-muted"
              onClick={() => {
                setModo('login')
                setErro(null)
              }}
            >
              ← voltar
            </button>
          </form>
        )}
      </Card>
    </main>
  )
}
