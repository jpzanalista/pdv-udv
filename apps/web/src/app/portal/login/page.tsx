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
import { TELEFONE_INICIAL, maskTelefone, telefoneCompleto } from '@/lib/telefone'

function soDigitos(v: string, max: number): string {
  return v.replace(/\D/g, '').slice(0, max)
}

export default function PortalLoginPage() {
  const router = useRouter()
  const [etapa, setEtapa] = useState<'whatsapp' | 'codigo'>('whatsapp')
  const [whatsapp, setWhatsapp] = useState(TELEFONE_INICIAL)
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  async function enviarCodigo(e: FormEvent) {
    e.preventDefault()
    if (!telefoneCompleto(whatsapp)) {
      setErro('Informe o WhatsApp completo: +55 (DDD) e 9 dígitos.')
      return
    }
    setCarregando(true)
    setErro(null)
    try {
      await api('/auth/socio/otp', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ whatsapp: whatsapp.trim() }),
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
        body: JSON.stringify({ whatsapp: whatsapp.trim(), code: soDigitos(codigo, 6) }),
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
        <div className="mb-5 flex items-center gap-3">
          <Logo size={44} />
          <div>
            <h1 className="text-2xl font-bold leading-none text-brand">Empório</h1>
            <p className="mt-1 text-ink-muted">Portal do sócio</p>
          </div>
        </div>

        {etapa === 'whatsapp' ? (
          <form onSubmit={enviarCodigo} className="flex flex-col gap-4">
            <Field label="WhatsApp" htmlFor="whatsapp">
              <Input
                id="whatsapp"
                inputMode="tel"
                placeholder="+55 (00) 00000-0000"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                onBlur={() => setWhatsapp(maskTelefone(whatsapp))}
                ref={desktopAutofocus}
              />
            </Field>
            {erro && <p className="text-sm text-danger">{erro}</p>}
            <Button type="submit" disabled={carregando}>
              {carregando ? 'Enviando…' : 'Enviar código'}
            </Button>
            <p className="text-center text-xs text-ink-light">
              Enviaremos um código de acesso para este WhatsApp.
            </p>
          </form>
        ) : (
          <form onSubmit={entrar} className="flex flex-col gap-4">
            <Field label="Código recebido" htmlFor="codigo">
              <Input
                id="codigo"
                inputMode="numeric"
                placeholder="0000"
                value={codigo}
                onChange={(e) => setCodigo(soDigitos(e.target.value, 6))}
                ref={desktopAutofocus}
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
                setEtapa('whatsapp')
                setCodigo('')
                setErro(null)
              }}
            >
              ← corrigir WhatsApp / reenviar
            </button>
          </form>
        )}
      </Card>
    </main>
  )
}
