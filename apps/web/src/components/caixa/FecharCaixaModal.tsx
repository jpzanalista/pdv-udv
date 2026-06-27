import { formatBRL } from '@pdv-udv/core'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Input'

export function FecharCaixaModal({
  esperadoCents,
  submitting,
  onConfirm,
  onClose,
}: {
  esperadoCents: number
  submitting: boolean
  onConfirm: (contadoCents: number) => void
  onClose: () => void
}) {
  const [contado, setContado] = useState('')
  const contadoCents = Math.round((Number.parseFloat(contado.replace(',', '.')) || 0) * 100)
  const dif = contadoCents - esperadoCents

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-lg font-semibold">Fechar caixa</h2>
        <p className="mb-3 text-ink-muted">
          Esperado em dinheiro: <b className="text-ink">{formatBRL(esperadoCents)}</b>
        </p>
        <Field label="Valor contado (R$)" htmlFor="contado">
          <Input
            id="contado"
            inputMode="decimal"
            value={contado}
            onChange={(e) => setContado(e.target.value)}
            placeholder="0,00"
            autoFocus
          />
        </Field>
        <p className="mt-2 text-sm">
          Diferença:{' '}
          <b className={dif < 0 ? 'text-danger' : dif > 0 ? 'text-success' : 'text-ink'}>
            {formatBRL(dif)} {dif < 0 ? '(falta)' : dif > 0 ? '(sobra)' : ''}
          </b>
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose} disabled={submitting}>
            Voltar
          </Button>
          <Button
            className="flex-1 min-h-touch-lg"
            onClick={() => onConfirm(contadoCents)}
            disabled={submitting}
          >
            {submitting ? 'Fechando…' : 'Confirmar fechamento'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
