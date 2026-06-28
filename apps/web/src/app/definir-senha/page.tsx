'use client'

import Link from 'next/link'
import { type FormEvent, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Input'
import { ApiError, api } from '@/lib/api'

export default function DefinirSenhaPage() {
  const [token, setToken] = useState('')
  const [senha, setSenha] = useState('')
  const [conf, setConf] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') ?? '')
  }, [])

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (senha.length < 6) {
      setErro('A senha deve ter ao menos 6 caracteres.')
      return
    }
    if (senha !== conf) {
      setErro('As senhas não conferem.')
      return
    }
    setErro(null)
    setCarregando(true)
    try {
      await api('/auth/emporio/definir-senha', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ token, senha }),
      })
      setOk(true)
    } catch (err) {
      setErro(
        err instanceof ApiError && err.status === 401
          ? 'Link inválido ou expirado. Peça um novo.'
          : 'Não foi possível definir a senha.',
      )
    } finally {
      setCarregando(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-2xl font-bold text-brand">Definir senha</h1>
        <p className="mb-5 text-ink-muted">Empório · responsável</p>

        {ok ? (
          <>
            <p className="text-sm font-semibold text-success">Senha definida com sucesso ✓</p>
            <Link
              href="/login/emporio"
              className="mt-4 inline-block font-semibold text-brand no-underline"
            >
              Ir para o login →
            </Link>
          </>
        ) : !token ? (
          <p className="text-sm text-danger">Link sem token. Use o link recebido por e-mail.</p>
        ) : (
          <form onSubmit={salvar} className="flex flex-col gap-4">
            <Field label="Nova senha" htmlFor="senha">
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="new-password"
                autoFocus
              />
            </Field>
            <Field label="Confirmar senha" htmlFor="conf">
              <Input
                id="conf"
                type="password"
                value={conf}
                onChange={(e) => setConf(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
            {erro && <p className="text-sm text-danger">{erro}</p>}
            <Button type="submit" disabled={carregando}>
              {carregando ? 'Salvando…' : 'Salvar senha'}
            </Button>
          </form>
        )}
      </Card>
    </main>
  )
}
