'use client'

import { formatBRL } from '@pdv-udv/core'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Input'
import { ApiError, api } from '@/lib/api'
import { TELEFONE_INICIAL, maskTelefone, telefoneCompleto } from '@/lib/telefone'

export type ReciboData = {
  vendaId: string
  numero: number
  itens: { descricao: string; qtde: number; totalCents: number }[]
  subtotalCents: number
  descontoCents: number
  totalCents: number
  metodo: string
  clienteNome: string | null
  clienteTipo: string | null
  telefone: string | null
}

const METODO: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao_credito: 'Cartão crédito',
  cartao_debito: 'Cartão débito',
  conta: 'Na conta',
}
const TIPO: Record<string, string> = {
  socio: 'Sócio',
  visitante: 'Visitante',
  institucional: 'Institucional',
}

/**
 * Recibo da venda. Regra do núcleo: todo recibo é enviado por WhatsApp — ou não é enviado.
 * Sem impressão/compartilhamento genérico.
 */
export function ReciboModal({
  recibo,
  onClose,
}: {
  recibo: ReciboData
  onClose: () => void
}) {
  const [telefone, setTelefone] = useState(
    recibo.telefone ? maskTelefone(recibo.telefone) : TELEFONE_INICIAL,
  )
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function enviar() {
    if (!telefoneCompleto(telefone)) {
      setErro('Informe um WhatsApp completo: +55 (DDD) e 9 dígitos.')
      return
    }
    setEnviando(true)
    setErro(null)
    try {
      const r = await api<{ enviado: boolean; telefone: string }>(
        `/vendas/${recibo.vendaId}/recibo`,
        { method: 'POST', body: JSON.stringify({ telefone: telefone.trim() }) },
      )
      if (r.enviado) setEnviado(true)
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível enviar o recibo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-start justify-center overflow-auto bg-black/40 p-4"
      onClick={onClose}
    >
      <Card className="my-6 w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-success">Venda #{recibo.numero} registrada ✓</h2>
            <p className="text-sm text-ink-muted">Envie o recibo por WhatsApp.</p>
          </div>
          <button type="button" onClick={onClose} className="px-2 text-ink-light">
            ✕
          </button>
        </div>

        {/* Cupom */}
        <div className="mb-4 rounded-lg border border-line bg-canvas p-3 text-sm">
          <ul className="divide-y divide-line">
            {recibo.itens.map((it, i) => (
              <li key={i} className="flex justify-between py-1">
                <span>
                  {it.qtde}× {it.descricao}
                </span>
                <span className="font-medium">{formatBRL(it.totalCents)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 space-y-0.5 border-t border-line pt-2">
            {recibo.descontoCents > 0 && (
              <>
                <Linha rotulo="Subtotal" valor={formatBRL(recibo.subtotalCents)} />
                <Linha rotulo="Desconto" valor={`− ${formatBRL(recibo.descontoCents)}`} />
              </>
            )}
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>{formatBRL(recibo.totalCents)}</span>
            </div>
            <p className="pt-1 text-ink-muted">
              {METODO[recibo.metodo] ?? recibo.metodo}
              {recibo.clienteNome && (
                <>
                  {' · '}
                  {recibo.clienteTipo ? `${TIPO[recibo.clienteTipo] ?? recibo.clienteTipo} — ` : ''}
                  {recibo.clienteNome}
                </>
              )}
            </p>
          </div>
        </div>

        {enviado ? (
          <div className="rounded-lg bg-success/10 p-3 text-center text-sm font-semibold text-success">
            Recibo enviado por WhatsApp ✓
            <Button className="mt-3 w-full" onClick={onClose}>
              Nova venda
            </Button>
          </div>
        ) : (
          <>
            <Field label="WhatsApp do cliente" htmlFor="recibo-tel">
              <Input
                id="recibo-tel"
                inputMode="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                onBlur={() => setTelefone(maskTelefone(telefone))}
                placeholder="+55 (00) 00000-0000"
                autoFocus
              />
            </Field>
            {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}
            <div className="mt-4 flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={onClose} disabled={enviando}>
                Não enviar
              </Button>
              <Button className="flex-1" onClick={enviar} disabled={enviando}>
                {enviando ? 'Enviando…' : 'Enviar recibo'}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between text-ink-muted">
      <span>{rotulo}</span>
      <span>{valor}</span>
    </div>
  )
}
