import { type FormEvent, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Input'
import { ApiError, api } from '@/lib/api'
import type { Produto } from '@/lib/types'

type Movimento = {
  id: string
  tipo: 'entrada' | 'ajuste'
  qtde: string
  saldoApos: string
  motivo: string | null
  data: string
}

function dataBR(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
const fmt = (s: string) => Number(s).toLocaleString('pt-BR', { maximumFractionDigits: 3 })

export function EstoqueModal({
  produto,
  onClose,
  onSaved,
}: {
  produto: Produto
  onClose: () => void
  onSaved: () => void
}) {
  const [saldo, setSaldo] = useState(Number(produto.estoqueAtual))
  const [tipo, setTipo] = useState<'entrada' | 'ajuste'>('entrada')
  const [qtde, setQtde] = useState('')
  const [motivo, setMotivo] = useState('')
  const [hist, setHist] = useState<Movimento[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function carregarHist() {
    try {
      setHist(await api<Movimento[]>(`/produtos/${produto.id}/estoque`))
    } catch {
      // silencioso
    }
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: carregar só na montagem
  useEffect(() => {
    carregarHist()
  }, [])

  async function salvar(e: FormEvent) {
    e.preventDefault()
    const q = Number(qtde.replace(',', '.'))
    if (!Number.isFinite(q) || q < 0 || (tipo === 'entrada' && q <= 0)) {
      setErro('Informe uma quantidade válida.')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      const r = await api<{ estoqueAtual: number }>(`/produtos/${produto.id}/estoque`, {
        method: 'POST',
        body: JSON.stringify({ tipo, qtde: q, motivo: motivo.trim() || undefined }),
      })
      setSaldo(r.estoqueAtual)
      setQtde('')
      setMotivo('')
      await carregarHist()
      onSaved()
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const baixo = saldo <= Number(produto.estoqueMinimo)

  return (
    <div
      className="fixed inset-0 z-10 flex items-start justify-center overflow-auto bg-black/40 p-4"
      onClick={onClose}
    >
      <Card className="my-6 w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Estoque</h2>
            <p className="text-sm text-ink-muted">{produto.descricao}</p>
          </div>
          <button type="button" onClick={onClose} className="px-2 text-ink-light">
            ✕
          </button>
        </div>

        <div className="mb-4 flex items-baseline justify-between rounded-lg bg-canvas p-3">
          <span className="font-semibold text-ink-muted">Saldo atual</span>
          <span className={`text-2xl font-bold ${baixo ? 'text-danger' : 'text-ink'}`}>
            {fmt(String(saldo))}
            {baixo && <span className="ml-2 align-middle text-xs font-semibold">abaixo do mínimo</span>}
          </span>
        </div>

        <form onSubmit={salvar} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTipo('entrada')}
              className={`min-h-touch rounded border px-3 text-sm font-semibold ${tipo === 'entrada' ? 'border-brand bg-brand-bg text-brand-dark' : 'border-line bg-surface text-ink-muted'}`}
            >
              Entrada (somar)
            </button>
            <button
              type="button"
              onClick={() => setTipo('ajuste')}
              className={`min-h-touch rounded border px-3 text-sm font-semibold ${tipo === 'ajuste' ? 'border-brand bg-brand-bg text-brand-dark' : 'border-line bg-surface text-ink-muted'}`}
            >
              Ajuste (definir)
            </button>
          </div>
          <Field label={tipo === 'entrada' ? 'Quantidade a somar' : 'Novo saldo'} htmlFor="qtde">
            <Input id="qtde" inputMode="decimal" value={qtde} onChange={(e) => setQtde(e.target.value)} autoFocus />
          </Field>
          <Field label="Motivo (opcional)" htmlFor="motivo">
            <Input id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="ex.: compra, contagem" />
          </Field>
          {erro && <p className="text-sm text-danger">{erro}</p>}
          <Button type="submit" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Registrar'}
          </Button>
        </form>

        {hist.length > 0 && (
          <div className="mt-4">
            <p className="mb-1 text-sm font-semibold text-ink-muted">Histórico</p>
            <ul className="divide-y divide-line text-sm">
              {hist.map((m) => (
                <li key={m.id} className="flex justify-between py-1">
                  <span className="text-ink-muted">
                    {dataBR(m.data)} · {m.tipo === 'entrada' ? '+' : '='}
                    {fmt(m.qtde)}
                    {m.motivo ? ` (${m.motivo})` : ''}
                  </span>
                  <span className="font-semibold">{fmt(m.saldoApos)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  )
}
