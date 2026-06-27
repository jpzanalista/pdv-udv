import { formatBRL } from '@pdv-udv/core'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Input'
import type { Ident } from '@/lib/types'

const AVISTA = [
  { id: 'dinheiro', label: 'Dinheiro' },
  { id: 'pix', label: 'Pix' },
  { id: 'cartao_debito', label: 'Cartão Débito' },
  { id: 'cartao_credito', label: 'Cartão Crédito' },
] as const

export function ReceberModal({
  totalCents,
  ident,
  submitting,
  onConfirm,
  onClose,
}: {
  totalCents: number
  ident: Ident
  submitting: boolean
  onConfirm: (metodo: string) => void
  onClose: () => void
}) {
  const [metodo, setMetodo] = useState<string | null>(null)
  const [recebido, setRecebido] = useState('')

  const recebidoCents = Math.round((Number.parseFloat(recebido.replace(',', '.')) || 0) * 100)
  const troco = metodo === 'dinheiro' ? recebidoCents - totalCents : 0
  const podeConfirmar =
    !!metodo && !submitting && (metodo !== 'dinheiro' || recebidoCents >= totalCents)

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Receber</h2>
          <span className="text-2xl font-bold text-ink">{formatBRL(totalCents)}</span>
        </div>

        {ident?.kind === 'socio' && (
          <button
            type="button"
            onClick={() => onConfirm('conta')}
            disabled={submitting}
            className="mb-4 min-h-touch-lg w-full rounded-lg bg-brand px-4 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            Lançar na conta de {ident.conta.nome}
          </button>
        )}

        <p className="mb-2 text-sm font-semibold text-ink-muted">Pagar na hora</p>
        <div className="grid grid-cols-2 gap-2">
          {AVISTA.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMetodo(m.id)}
              className={`min-h-touch rounded border px-3 font-semibold ${
                metodo === m.id
                  ? 'border-brand bg-brand-bg text-brand-dark'
                  : 'border-line bg-white text-ink-muted hover:bg-canvas'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {metodo === 'dinheiro' && (
          <div className="mt-3">
            <Field label="Valor recebido (R$)" htmlFor="recebido">
              <Input
                id="recebido"
                inputMode="decimal"
                value={recebido}
                onChange={(e) => setRecebido(e.target.value)}
                placeholder="0,00"
              />
            </Field>
            <p className="mt-1 text-sm text-ink-muted">
              Troco: <b>{formatBRL(Math.max(0, troco))}</b>
            </p>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose} disabled={submitting}>
            Voltar
          </Button>
          <Button
            className="flex-1 min-h-touch-lg"
            onClick={() => metodo && onConfirm(metodo)}
            disabled={!podeConfirmar}
          >
            {submitting ? 'Registrando…' : 'Confirmar'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
