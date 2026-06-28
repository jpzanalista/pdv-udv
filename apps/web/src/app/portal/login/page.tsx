'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Input'
import { ApiError, api } from '@/lib/api'
import { type TokenPair, setTokens } from '@/lib/auth'

function soDigitos(v: string, max: number): string {
  return v.replace(/\D/g, '').slice(0, max)
}
function maskCpf(v: string): string {
  const d = soDigitos(v, 11)
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

export default function PortalLoginPage() {
  const router = useRouter()
  const [etapa, setEtapa] = useState<'cpf' | 'codigo'>('cpf')
  const [cpf, setCpf] = useState('')
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  const cpfDigits = soDigitos(cpf, 11)

  async function enviarCodigo(e: FormEvent) {
    e.preventDefault()
    if (cpfDigits.length !== 11) {
      setErro('Informe os 11 dígitos do CPF.')
      return
    }
    setCarregando(true)
    setErro(null)
    try {
      await api('/auth/socio/otp', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ cpf: cpfDigits }),
      })
      setEtapa('codigo')
    } catch {
      setErro('Não foi possível enviar o código. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro(null)
    try {
      const t = await api<TokenPair>('/auth/socio/verify', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ cpf: cpfDigits, code: soDigitos(codigo, 6) }),
      })
      setTokens(t)
      router.replace('/portal')
    } catch (err) {
      setErro(
        err instanceof ApiError && err.status === 401
          ? 'Código inválido ou expirado.'
          : 'Não foi possível entrar.',
      )
    } finally {
      setCarregando(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-2xl font-bold text-brand">Minha conta</h1>
        <p className="mb-5 text-ink-muted">Portal do sócio · empório UDV</p>

        {etapa === 'cpf' ? (
          <form onSubmit={enviarCodigo} className="flex flex-col gap-4">
            <Field label="CPF" htmlFor="cpf">
              <Input
                id="cpf"
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(maskCpf(e.target.value))}
                autoFocus
              />
            </Field>
            {erro && <p className="text-sm text-danger">{erro}</p>}
            <Button type="submit" disabled={carregando}>
              {carregando ? 'Enviando…' : 'Enviar código'}
            </Button>
            <p className="text-center text-xs text-ink-light">
              Enviaremos um código pelo WhatsApp cadastrado.
            </p>
          </form>
        ) : (
          <form onSubmit={entrar} className="flex flex-col gap-4">
            <Field label="Código recebido" htmlFor="codigo">
              <Input
                id="codigo"
                inputMode="numeric"
                placeholder="000000"
                value={codigo}
                onChange={(e) => setCodigo(soDigitos(e.target.value, 6))}
                autoFocus
              />
            </Field>
            {erro && <p className="text-sm text-danger">{erro}</p>}
            <Button type="submit" disabled={carregando || soDigitos(codigo, 6).length < 4}>
              {carregando ? 'Entrando…' : 'Entrar'}
            </Button>
            <button
              type="button"
              className="text-center text-sm text-brand"
              onClick={() => {
                setEtapa('cpf')
                setCodigo('')
                setErro(null)
              }}
            >
              ← corrigir CPF / reenviar
            </button>
          </form>
        )}
      </Card>
    </main>
  )
}
