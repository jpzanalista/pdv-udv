import { formatBRL } from '@pdv-udv/core'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Input'

export function AbrirCaixa({
  submitting,
  sugestaoFundoCents,
  onAbrir,
}: {
  submitting: boolean
  sugestaoFundoCents: number | null
  onAbrir: (fundoCents: number) => void
}) {
  const [fundo, setFundo] = useState(
    sugestaoFundoCents != null ? (sugestaoFundoCents / 100).toFixed(2) : '',
  )
  const cents = Math.round((Number.parseFloat(fundo.replace(',', '.')) || 0) * 100)

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-2xl font-bold text-brand">Abrir caixa</h1>
        <p className="mb-5 text-ink-muted">Informe o fundo de troco para começar.</p>
        <Field label="Fundo de troco (R$)" htmlFor="fundo">
          <Input
            id="fundo"
            inputMode="decimal"
            value={fundo}
            onChange={(e) => setFundo(e.target.value)}
            placeholder="0,00"
            autoFocus
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
        <Button
          className="mt-5 w-full min-h-touch-lg"
          onClick={() => onAbrir(cents)}
          disabled={submitting}
        >
          {submitting ? 'Abrindo…' : 'Abrir caixa'}
        </Button>
        <Link href="/" className="mt-4 block text-center text-sm text-ink-light">
          voltar
        </Link>
      </Card>
    </main>
  )
}
