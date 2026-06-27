import { formatBRL } from '@pdv-udv/core'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Input'

export type MovimentoPayload = {
  tipo: 'sangria' | 'suprimento'
  destino?: 'tesouraria' | 'compra'
  valorCents: number
  descricao?: string
  recebedor?: string
}

export function MovimentoModal({
  tipo,
  esperadoCents,
  submitting,
  onConfirm,
  onClose,
}: {
  tipo: 'sangria' | 'suprimento'
  esperadoCents: number
  submitting: boolean
  onConfirm: (p: MovimentoPayload) => void
  onClose: () => void
}) {
  const [destino, setDestino] = useState<'tesouraria' | 'compra'>('tesouraria')
  const [valor, setValor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [recebedor, setRecebedor] = useState('')

  const valorCents = Math.round((Number.parseFloat(valor.replace(',', '.')) || 0) * 100)
  const isSangria = tipo === 'sangria'
  const isCompra = isSangria && destino === 'compra'
  const podeConfirmar = valorCents > 0 && !submitting && (!isCompra || recebedor.trim().length > 0)

  function confirmar() {
    onConfirm({
      tipo,
      destino: isSangria ? destino : undefined,
      valorCents,
      descricao: descricao.trim() || undefined,
      recebedor: isCompra ? recebedor.trim() : undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">
            {isSangria ? 'Sangria (retirada)' : 'Suprimento (reforço)'}
          </h2>
          <span className="text-sm text-ink-muted">
            Em caixa: <b className="text-ink">{formatBRL(esperadoCents)}</b>
          </span>
        </div>

        {isSangria && (
          <div className="mb-4">
            <p className="mb-2 text-sm font-semibold text-ink-muted">Destino</p>
            <div className="grid grid-cols-2 gap-2">
              {(['tesouraria', 'compra'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDestino(d)}
                  className={`min-h-touch rounded border px-3 font-semibold capitalize ${
                    destino === d
                      ? 'border-brand bg-brand-bg text-brand-dark'
                      : 'border-line bg-white text-ink-muted hover:bg-canvas'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            {destino === 'tesouraria' && (
              <p className="mt-1 text-xs text-ink-light">
                Fica pendente de validação do tesoureiro (recibo na próxima etapa).
              </p>
            )}
          </div>
        )}

        <Field label="Valor (R$)" htmlFor="valor">
          <Input
            id="valor"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
            autoFocus
          />
        </Field>

        {isCompra && (
          <div className="mt-3">
            <Field label="Recebedor (para quem foi pago)" htmlFor="recebedor">
              <Input id="recebedor" value={recebedor} onChange={(e) => setRecebedor(e.target.value)} />
            </Field>
          </div>
        )}

        <div className="mt-3">
          <Field label={isCompra ? 'Descrição da compra' : 'Descrição (opcional)'} htmlFor="descricao">
            <Input id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </Field>
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose} disabled={submitting}>
            Voltar
          </Button>
          <Button className="flex-1 min-h-touch-lg" onClick={confirmar} disabled={!podeConfirmar}>
            {submitting ? 'Registrando…' : 'Confirmar'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
