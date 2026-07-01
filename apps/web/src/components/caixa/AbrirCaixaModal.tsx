import { formatBRL } from '@pdv-udv/core'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Input'
import { desktopAutofocus } from '@/lib/focus'

export function AbrirCaixaModal({
  submitting,
  sugestaoFundoCents,
  onAbrir,
  onClose,
}: {
  submitting: boolean
  sugestaoFundoCents: number | null
  onAbrir: (fundoCents: number) => void
  onClose: () => void
}) {
  const [fundo, setFundo] = useState(
    sugestaoFundoCents != null ? (sugestaoFundoCents / 100).toFixed(2) : '',
  )
  const cents = Math.round((Number.parseFloat(fundo.replace(',', '.')) || 0) * 100)

  return (
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <Card className="w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-brand">Abrir caixa</h2>
        <p className="mb-5 text-ink-muted">Informe o fundo de troco para começar.</p>
        <Field label="Fundo de troco (R$)" htmlFor="fundo">
          <Input
            id="fundo"
            inputMode="decimal"
            value={fundo}
            onChange={(e) => setFundo(e.target.value)}
            placeholder="0,00"
            ref={desktopAutofocus}
          />
        </Field>
        {sugestaoFundoCents != null && (
          <p className="mt-1 text-xs text-ink-light">
            Sugerido (sobrou no último fechamento):{' '}
            <button
              type="button"
              className="font-semibold text-brand underline"
              onClick={() => setFundo((sugestaoFundoCents / 100).toFixed(2))}
            >
              {formatBRL(sugestaoFundoCents)}
            </button>
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            className="min-h-touch-lg flex-1"
            onClick={() => onAbrir(cents)}
            disabled={submitting}
          >
            {submitting ? 'Abrindo…' : 'Abrir caixa'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
