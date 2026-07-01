'use client'

import { useState } from 'react'
import { ApiError, api } from '@/lib/api'
import { fmtDataHora } from '@/lib/datahora'
import { TELEFONE_INICIAL, maskTelefone, telefoneCompleto } from '@/lib/telefone'

/**
 * Status do recibo + (re)envio por WhatsApp de uma venda. Reaproveitado em
 * Consultar Vendas e no Extrato da conta. Envio síncrono: só marca enviado no sucesso.
 */
export function EnviarReciboInline({
  vendaId,
  enviadoEm,
  telefoneSugerido,
  timezone,
  onEnviado,
}: {
  vendaId: string
  enviadoEm: string | null
  telefoneSugerido: string | null
  timezone?: string
  onEnviado?: (enviadoEm: string) => void
}) {
  const [enviadoLocal, setEnviadoLocal] = useState<string | null>(enviadoEm)
  const [aberto, setAberto] = useState(false)
  const [telefone, setTelefone] = useState(
    telefoneSugerido ? maskTelefone(telefoneSugerido) : TELEFONE_INICIAL,
  )
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function enviar() {
    if (!telefoneCompleto(telefone)) {
      setErro('WhatsApp incompleto: +55 (DDD) e 9 dígitos.')
      return
    }
    setEnviando(true)
    setErro(null)
    try {
      const r = await api<{ enviado: boolean; enviadoEm: string }>(`/vendas/${vendaId}/recibo`, {
        method: 'POST',
        body: JSON.stringify({ telefone: telefone.trim() }),
      })
      if (r.enviado) {
        setEnviadoLocal(r.enviadoEm)
        setAberto(false)
        onEnviado?.(r.enviadoEm)
      }
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível enviar o recibo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      {enviadoLocal ? (
        <span className="text-success">✓ Recibo enviado em {fmtDataHora(enviadoLocal, timezone)}</span>
      ) : (
        <span className="text-ink-light">Recibo não enviado</span>
      )}

      {!aberto ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setErro(null)
            setAberto(true)
          }}
          className="font-semibold text-brand"
        >
          {enviadoLocal ? 'Reenviar recibo' : 'Enviar recibo'}
        </button>
      ) : (
        <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <input
            inputMode="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            onBlur={() => setTelefone(maskTelefone(telefone))}
            placeholder="+55 (00) 00000-0000"
            className="min-h-touch w-44 rounded border border-line bg-surface px-2 text-sm text-ink"
          />
          <button
            type="button"
            onClick={enviar}
            disabled={enviando}
            className="min-h-touch rounded bg-brand px-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {enviando ? 'Enviando…' : 'Enviar'}
          </button>
          <button
            type="button"
            onClick={() => setAberto(false)}
            disabled={enviando}
            className="px-2 text-sm text-ink-light"
          >
            Cancelar
          </button>
        </span>
      )}

      {erro && <span className="w-full text-danger">{erro}</span>}
    </div>
  )
}
