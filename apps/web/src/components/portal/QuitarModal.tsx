import { formatBRL } from '@pdv-udv/core'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Input'
import { ApiError, api } from '@/lib/api'

type PixResult = {
  paymentId: string
  copiaECola: string
  qrImage: string | null
  invoiceUrl: string
  valorCents: number
}

export function QuitarModal({
  contaId,
  contaNome,
  saldoCents,
  onAtualizar,
  onClose,
}: {
  contaId: string
  contaNome: string
  saldoCents: number
  onAtualizar: () => void
  onClose: () => void
}) {
  const [valor, setValor] = useState((saldoCents / 100).toFixed(2))
  const [pix, setPix] = useState<PixResult | null>(null)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  async function gerar() {
    const cents = Math.round(Number(valor.replace(',', '.')) * 100)
    if (!Number.isFinite(cents) || cents <= 0) {
      setErro('Informe um valor válido.')
      return
    }
    setGerando(true)
    setErro(null)
    try {
      setPix(
        await api<PixResult>(`/portal/contas/${contaId}/quitar`, {
          method: 'POST',
          body: JSON.stringify({ valorCents: cents }),
        }),
      )
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível gerar o Pix.')
    } finally {
      setGerando(false)
    }
  }

  async function copiar() {
    if (!pix) return
    try {
      await navigator.clipboard.writeText(pix.copiaECola)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // ignora — o usuário pode selecionar manualmente
    }
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-start justify-center overflow-auto bg-black/40 p-4"
      onClick={onClose}
    >
      <Card className="my-6 w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Quitar via Pix</h2>
            <p className="text-sm text-ink-muted">{contaNome}</p>
          </div>
          <button type="button" onClick={onClose} className="px-2 text-ink-light">
            ✕
          </button>
        </div>

        {!pix ? (
          <>
            <Field label="Valor (R$)" htmlFor="q-valor">
              <Input
                id="q-valor"
                inputMode="decimal"
                autoFocus
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </Field>
            <p className="mt-1 text-xs text-ink-light">Saldo em aberto: {formatBRL(saldoCents)}</p>
            {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}
            <Button className="mt-4 w-full" onClick={gerar} disabled={gerando}>
              {gerando ? 'Gerando…' : 'Gerar Pix'}
            </Button>
          </>
        ) : (
          <>
            <p className="text-center text-2xl font-bold text-ink">{formatBRL(pix.valorCents)}</p>
            {pix.qrImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/png;base64,${pix.qrImage}`}
                alt="QR Code Pix"
                className="mx-auto my-3 h-48 w-48"
              />
            )}
            <p className="mb-1 text-sm font-semibold text-ink-muted">Pix copia e cola</p>
            <textarea
              readOnly
              value={pix.copiaECola}
              className="h-20 w-full resize-none rounded border border-line bg-canvas p-2 text-xs"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button variant="secondary" className="mt-2 w-full" onClick={copiar}>
              {copiado ? 'Copiado ✓' : 'Copiar código'}
            </Button>
            <a
              href={pix.invoiceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block text-center text-sm text-brand"
            >
              Abrir fatura/pagamento →
            </a>
            <p className="mt-3 text-center text-xs text-ink-light">
              Após pagar, o saldo baixa automaticamente.
            </p>
            <Button
              className="mt-3 w-full"
              onClick={() => {
                onAtualizar()
                onClose()
              }}
            >
              Já paguei / Atualizar saldo
            </Button>
          </>
        )}
      </Card>
    </div>
  )
}
