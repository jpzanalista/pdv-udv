'use client'

import { formatBRL } from '@pdv-udv/core'
import { ChevronDown, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { ApiError, api } from '@/lib/api'
import { getToken } from '@/lib/auth'
import { cn } from '@/lib/utils'

const ALLOWED = ['responsavel_emporio', 'admin']
const METODO: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao_credito: 'Crédito',
  cartao_debito: 'Débito',
  conta: 'Na conta',
}

type Item = { id: string; descricao: string; qtde: number; unitarioCents: number; devolvido: number }
type VendaRecente = { id: string; numero: number; totalCents: number; metodo: string; itens: Item[] }

export default function DevolucoesPage() {
  const router = useRouter()
  const [me, setMe] = useState<{ role: string } | null>(null)
  const [vendas, setVendas] = useState<VendaRecente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [aberta, setAberta] = useState<string | null>(null)
  const [qtd, setQtd] = useState<Record<string, string>>({}) // vendaItemId → qtde a devolver
  const [motivo, setMotivo] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const carregar = useCallback(async () => {
    try {
      setVendas(await api<VendaRecente[]>('/vendas/recentes'))
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) router.replace('/login')
    } finally {
      setCarregando(false)
    }
  }, [router])

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    api<{ role: string }>('/auth/me')
      .then((m) => {
        setMe(m)
        if (ALLOWED.includes(m.role)) return carregar()
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) router.replace('/login')
      })
      .finally(() => setCarregando(false))
  }, [router, carregar])

  function abrir(v: VendaRecente) {
    setAberta(aberta === v.id ? null : v.id)
    setQtd({})
    setMotivo('')
    setMsg(null)
  }

  async function devolver(v: VendaRecente) {
    const itens = v.itens
      .map((i) => ({ vendaItemId: i.id, qtde: Number((qtd[i.id] ?? '').replace(',', '.')) || 0 }))
      .filter((i) => i.qtde > 0)
    if (itens.length === 0) {
      setMsg('Informe a quantidade a devolver em ao menos um item.')
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const r = await api<{ totalCents: number }>(`/vendas/${v.id}/devolver`, {
        method: 'POST',
        body: JSON.stringify({ itens, motivo: motivo.trim() || undefined }),
      })
      setMsg(`Devolução registrada: ${formatBRL(r.totalCents)}.`)
      setAberta(null)
      await carregar()
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'Erro ao devolver.')
    } finally {
      setBusy(false)
    }
  }

  if (carregando)
    return <main className="grid min-h-[100dvh] place-items-center text-ink-muted">Carregando…</main>
  if (me && !ALLOWED.includes(me.role))
    return (
      <AppShell title="Devoluções">
        <Card className="p-6 text-ink-muted">Acesso restrito ao responsável do empório.</Card>
      </AppShell>
    )

  return (
    <AppShell title="Devoluções">
      <div className="mx-auto max-w-2xl">
        <div className="border-b border-line pb-4">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
            <RotateCcw size={22} className="text-brand" /> Devoluções
          </h1>
          <p className="mt-1 text-base text-ink-muted">
            Vendas do expediente aberto. Toque numa venda para devolver itens.
          </p>
        </div>

        {msg && <p className="mt-3 text-sm font-semibold text-ink">{msg}</p>}

        <div className="mt-4 space-y-2">
          {vendas.map((v) => {
            const expandida = aberta === v.id
            return (
              <Card key={v.id} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => abrir(v)}
                  className="flex w-full items-center gap-3 p-3 text-left"
                >
                  <span className="flex-1 font-semibold text-ink">
                    Venda #{v.numero}{' '}
                    <span className="font-normal text-ink-muted">· {METODO[v.metodo] ?? v.metodo}</span>
                  </span>
                  <span className="font-bold text-ink">{formatBRL(v.totalCents)}</span>
                  <ChevronDown
                    size={18}
                    className={cn('text-ink-light transition-transform', expandida && 'rotate-180')}
                  />
                </button>

                {expandida && (
                  <div className="border-t border-line px-3 py-3">
                    <div className="space-y-1.5">
                      {v.itens.map((i) => {
                        const disp = i.qtde - i.devolvido
                        return (
                          <div
                            key={i.id}
                            className="flex items-center gap-3 rounded-lg border border-line/60 px-3 py-2"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-ink">{i.descricao}</p>
                              <p className="text-xs text-ink-light">
                                Vendido {i.qtde}
                                {i.devolvido > 0 && ` · já devolvido ${i.devolvido}`}
                              </p>
                            </div>
                            {disp <= 0 ? (
                              <span className="text-sm text-ink-light">devolvido</span>
                            ) : (
                              <Input
                                inputMode="decimal"
                                className="h-10 w-20 text-right text-base"
                                placeholder={`0/${disp}`}
                                value={qtd[i.id] ?? ''}
                                onChange={(e) => setQtd((p) => ({ ...p, [i.id]: e.target.value }))}
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <Input
                      className="mt-3 h-11 text-base"
                      placeholder="Motivo (opcional)"
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                    />
                    <Button
                      className="mt-3 min-h-touch-lg w-full"
                      onClick={() => devolver(v)}
                      disabled={busy}
                    >
                      <RotateCcw size={16} /> {busy ? 'Registrando…' : 'Confirmar devolução'}
                    </Button>
                  </div>
                )}
              </Card>
            )
          })}
          {vendas.length === 0 && (
            <Card className="p-6 text-center text-ink-light">Nenhuma venda no expediente aberto.</Card>
          )}
        </div>
      </div>
    </AppShell>
  )
}
