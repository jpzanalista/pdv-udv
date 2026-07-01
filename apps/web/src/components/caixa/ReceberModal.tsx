import { formatBRL } from '@pdv-udv/core'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Input'
import { TELEFONE_INICIAL, maskTelefone, telefoneCompleto, telefoneParaSalvar } from '@/lib/telefone'
import type { Conta } from '@/lib/types'

export type ReceberPayload = {
  metodo: string
  contaId?: string
  novaConta?: { tipo: string; nome: string; cpf?: string; whatsapp?: string }
  personKind?: 'socio' | 'visitante'
  descontoCents?: number
}

const AVISTA = [
  { id: 'dinheiro', label: 'Dinheiro' },
  { id: 'pix', label: 'Pix' },
  { id: 'cartao_debito', label: 'Cartão Débito' },
  { id: 'cartao_credito', label: 'Cartão Crédito' },
] as const

const TIPOS = [
  { value: 'socio', label: 'Sócio' },
  { value: 'visitante', label: 'Visitante' },
  { value: 'institucional', label: 'Institucional' },
] as const

// person_kind só tem socio/visitante; institucional vai sem personKind (só contaId).
const PERSON_KIND: Record<string, 'socio' | 'visitante' | undefined> = {
  socio: 'socio',
  visitante: 'visitante',
  institucional: undefined,
}

type Mode = 'forma' | 'tipo' | 'conta' | 'nova'

export function ReceberModal({
  totalCents,
  contas,
  submitting,
  onConfirm,
  onClose,
}: {
  totalCents: number
  contas: Conta[]
  submitting: boolean
  onConfirm: (payload: ReceberPayload) => void
  onClose: () => void
}) {
  const [mode, setMode] = useState<Mode>('forma')
  const [desconto, setDesconto] = useState('')
  // à vista
  const [metodo, setMetodo] = useState<string | null>(null)
  const [recebido, setRecebido] = useState('')
  // na conta
  const [tipo, setTipo] = useState<string>('socio')
  const [busca, setBusca] = useState('')
  // nova conta
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [whatsapp, setWhatsapp] = useState(TELEFONE_INICIAL)

  const descontoCents = Math.min(
    totalCents,
    Math.max(0, Math.round((Number.parseFloat(desconto.replace(',', '.')) || 0) * 100)),
  )
  const aPagarCents = totalCents - descontoCents

  const recebidoCents = Math.round((Number.parseFloat(recebido.replace(',', '.')) || 0) * 100)
  const troco = metodo === 'dinheiro' ? recebidoCents - aPagarCents : 0
  const podeAvista = !!metodo && !submitting && (metodo !== 'dinheiro' || recebidoCents >= aPagarCents)
  const tipoLabel = TIPOS.find((t) => t.value === tipo)?.label ?? ''

  const contasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    const base = contas.filter((c) => c.tipo === tipo)
    return (q ? base.filter((c) => c.nome.toLowerCase().includes(q)) : base).slice(0, 50)
  }, [contas, tipo, busca])

  function escolherTipo(t: string) {
    setTipo(t)
    setBusca('')
    setMode('conta')
  }
  const exigeWhats = tipo === 'visitante' // visitante recebe o link Pix por WhatsApp
  const whatsOk = !exigeWhats || telefoneCompleto(whatsapp)

  function criarELancar() {
    if (!nome.trim() || !whatsOk) return
    onConfirm({
      metodo: 'conta',
      novaConta: {
        tipo,
        nome: nome.trim(),
        cpf: cpf.trim() || undefined,
        whatsapp: telefoneParaSalvar(whatsapp),
      },
      personKind: PERSON_KIND[tipo],
      descontoCents,
    })
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Receber</h2>
          <span className={`text-2xl font-bold ${descontoCents > 0 ? 'text-ink-light line-through' : 'text-ink'}`}>
            {formatBRL(totalCents)}
          </span>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm text-ink-muted">Desconto (R$)</span>
          <Input
            inputMode="decimal"
            value={desconto}
            onChange={(e) => setDesconto(e.target.value)}
            placeholder="0,00"
            className="w-24 text-right"
          />
          {descontoCents > 0 && (
            <span className="ml-auto text-sm">
              A pagar <b className="text-brand">{formatBRL(aPagarCents)}</b>
            </span>
          )}
        </div>

        {mode === 'forma' && (
          <>
            <button
              type="button"
              onClick={() => setMode('tipo')}
              disabled={submitting}
              className="mb-4 min-h-touch-lg w-full rounded-lg bg-brand px-4 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              Lançar na conta →
            </button>

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
                      : 'border-line bg-surface text-ink-muted hover:bg-canvas'
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
                Cancelar
              </Button>
              <Button
                className="min-h-touch-lg flex-1"
                onClick={() => metodo && onConfirm({ metodo, descontoCents })}
                disabled={!podeAvista}
              >
                {submitting ? 'Registrando…' : 'Confirmar'}
              </Button>
            </div>
          </>
        )}

        {mode === 'tipo' && (
          <>
            <p className="mb-2 text-sm font-semibold text-ink-muted">Lançar na conta de…</p>
            <div className="flex flex-col gap-2">
              {TIPOS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => escolherTipo(t.value)}
                  className="min-h-touch-lg rounded-lg border border-line bg-surface px-4 font-semibold text-ink hover:border-brand hover:bg-brand-subtle"
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="mt-5">
              <Button variant="ghost" className="w-full" onClick={() => setMode('forma')} disabled={submitting}>
                ← Voltar
              </Button>
            </div>
          </>
        )}

        {mode === 'conta' && (
          <>
            <p className="mb-2 text-sm font-semibold text-ink-muted">{tipoLabel} — escolha a conta</p>
            <Input
              autoFocus
              placeholder="Buscar por nome…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <button
              type="button"
              onClick={() => {
                setNome(busca)
                setMode('nova')
              }}
              className="mt-2 min-h-touch w-full rounded border border-dashed border-brand px-3 text-sm font-semibold text-brand hover:bg-brand-subtle"
            >
              + Nova conta {tipoLabel}
            </button>
            <ul className="mt-3 max-h-60 divide-y divide-line overflow-auto">
              {contasFiltradas.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() =>
                      onConfirm({
                        metodo: 'conta',
                        contaId: c.id,
                        personKind: PERSON_KIND[c.tipo],
                        descontoCents,
                      })
                    }
                    className="min-h-touch w-full px-1 py-2 text-left hover:bg-brand-subtle disabled:opacity-50"
                  >
                    {c.nome}
                  </button>
                </li>
              ))}
              {contasFiltradas.length === 0 && (
                <li className="p-3 text-ink-light">Nenhuma conta {tipoLabel.toLowerCase()} encontrada.</li>
              )}
            </ul>
            <div className="mt-4">
              <Button variant="ghost" className="w-full" onClick={() => setMode('tipo')} disabled={submitting}>
                ← Voltar
              </Button>
            </div>
          </>
        )}

        {mode === 'nova' && (
          <>
            <p className="mb-2 text-sm font-semibold text-ink-muted">Nova conta {tipoLabel}</p>
            <div className="flex flex-col gap-3">
              <Field label="Nome" htmlFor="novo-nome">
                <Input id="novo-nome" autoFocus value={nome} onChange={(e) => setNome(e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="CPF (opcional)" htmlFor="novo-cpf">
                  <Input id="novo-cpf" inputMode="numeric" value={cpf} onChange={(e) => setCpf(e.target.value)} />
                </Field>
                <Field
                  label={exigeWhats ? 'WhatsApp (obrigatório)' : 'WhatsApp (opcional)'}
                  htmlFor="novo-wa"
                >
                  <Input
                    id="novo-wa"
                    inputMode="tel"
                    placeholder="+55 (00) 00000-0000"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    onBlur={() => setWhatsapp(maskTelefone(whatsapp))}
                  />
                </Field>
              </div>
              {exigeWhats && (
                <p className="-mt-1 text-xs text-ink-light">
                  O visitante recebe o link de pagamento (Pix/ASAAS) por WhatsApp — por isso é
                  obrigatório.
                </p>
              )}
            </div>
            <div className="mt-5 flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setMode('conta')} disabled={submitting}>
                ← Voltar
              </Button>
              <Button
                className="min-h-touch-lg flex-1"
                onClick={criarELancar}
                disabled={submitting || !nome.trim() || !whatsOk}
              >
                {submitting ? 'Registrando…' : 'Criar e lançar'}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
