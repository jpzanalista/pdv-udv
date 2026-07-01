import { formatBRL } from '@pdv-udv/core'
import { Check, Copy, ExternalLink, QrCode, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Input'
import { ApiError, api } from '@/lib/api'
import { desktopAutofocus } from '@/lib/focus'

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
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-bg text-brand">
              <QrCode size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-ink">Quitar via Pix</h2>
              <p className="text-sm text-ink-muted">{contaNome}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1 text-ink-light hover:bg-canvas hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        {!pix ? (
          <>
            <Field label="Valor (R$)" htmlFor="q-valor">
              <Input
                id="q-valor"
                inputMode="decimal"
                ref={desktopAutofocus}
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="h-12 text-lg font-semibold"
              />
            </Field>
            <p className="mt-1.5 text-xs text-ink-light">
              Saldo em aberto: <strong className="text-ink-muted">{formatBRL(saldoCents)}</strong>
            </p>
            {erro && <p className="mt-2 text-sm font-semibold text-danger">{erro}</p>}
            <Button className="mt-4 min-h-touch-lg w-full" onClick={gerar} disabled={gerando}>
              <QrCode size={18} /> {gerando ? 'Gerando…' : 'Gerar Pix'}
            </Button>
          </>
        ) : (
          <>
            {/* Valor em destaque */}
            <div className="rounded-xl bg-brand-subtle p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-light">Valor a pagar</p>
              <p className="text-3xl font-extrabold text-ink">{formatBRL(pix.valorCents)}</p>
            </div>

            {/* QR code */}
            {pix.qrImage && (
              <div className="mx-auto mt-4 w-fit rounded-xl border border-line bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${pix.qrImage}`}
                  alt="QR Code Pix"
                  className="h-44 w-44"
                />
              </div>
            )}

            {/* Copia e cola */}
            <div className="mt-4">
              <p className="mb-1.5 text-sm font-semibold text-ink-muted">Pix copia e cola</p>
              <div className="flex items-stretch gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg border border-line bg-canvas px-3 py-2.5 font-mono text-xs text-ink-muted">
                  {pix.copiaECola}
                </code>
                <button
                  type="button"
                  onClick={copiar}
                  aria-label="Copiar código Pix"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3 text-sm font-semibold text-white hover:opacity-90"
                >
                  {copiado ? <Check size={16} /> : <Copy size={16} />}
                  {copiado ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            <a
              href={pix.invoiceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-brand hover:underline"
            >
              <ExternalLink size={14} /> Abrir fatura / pagamento
            </a>

            <p className="mt-3 rounded-lg bg-canvas px-3 py-2 text-center text-xs text-ink-light">
              Após pagar, o saldo baixa automaticamente.
            </p>

            <Button
              variant="secondary"
              className="mt-3 min-h-touch-lg w-full"
              onClick={() => {
                onAtualizar()
                onClose()
              }}
            >
              Já paguei · atualizar saldo
            </Button>
          </>
        )}
      </Card>
    </div>
  )
}
