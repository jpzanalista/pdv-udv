'use client'

import { formatBRL } from '@pdv-udv/core'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { ApiError, api } from '@/lib/api'
import { getToken } from '@/lib/auth'

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

  if (carregando) return <main className="p-8 text-ink-muted">Carregando…</main>
  if (me && !ALLOWED.includes(me.role))
    return (
      <main className="p-8">
        <h1 className="text-xl font-bold text-brand">Devoluções</h1>
        <p className="mt-2 text-ink-muted">Acesso restrito ao responsável.</p>
        <Link href="/caixa" className="mt-2 inline-block text-brand">
          ← caixa
        </Link>
      </main>
    )

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand">Devoluções</h1>
        <Link href="/caixa" className="text-sm text-ink-muted">
          ← caixa
        </Link>
      </div>
      <p className="mt-1 text-ink-muted">Vendas do expediente aberto. Clique para devolver itens.</p>
      {msg && <p className="mt-2 text-sm font-semibold text-ink">{msg}</p>}

      <div className="mt-4 space-y-2">
        {vendas.map((v) => {
          const expandida = aberta === v.id
          return (
            <Card key={v.id} className="p-3">
              <button
                type="button"
                onClick={() => abrir(v)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <span className="font-semibold">
                  Venda #{v.numero} · {METODO[v.metodo] ?? v.metodo}
                </span>
                <span className="font-bold text-ink">{formatBRL(v.totalCents)}</span>
              </button>

              {expandida && (
                <div className="mt-3 border-t border-line pt-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-ink-light">
                        <th className="py-1">Item</th>
                        <th className="py-1 text-right">Vend.</th>
                        <th className="py-1 text-right">Devolv.</th>
                        <th className="py-1 text-right">Devolver</th>
                      </tr>
                    </thead>
                    <tbody>
                      {v.itens.map((i) => {
                        const disp = i.qtde - i.devolvido
                        return (
                          <tr key={i.id} className="border-t border-line">
                            <td className="py-1">{i.descricao}</td>
                            <td className="py-1 text-right">{i.qtde}</td>
                            <td className="py-1 text-right text-ink-light">{i.devolvido}</td>
                            <td className="py-1 text-right">
                              {disp <= 0 ? (
                                <span className="text-ink-light">—</span>
                              ) : (
                                <Input
                                  inputMode="decimal"
                                  className="w-16 text-right"
                                  placeholder={`0/${disp}`}
                                  value={qtd[i.id] ?? ''}
                                  onChange={(e) => setQtd((p) => ({ ...p, [i.id]: e.target.value }))}
                                />
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <Input
                    className="mt-3"
                    placeholder="Motivo (opcional)"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                  />
                  <Button className="mt-3 w-full" onClick={() => devolver(v)} disabled={busy}>
                    {busy ? 'Registrando…' : 'Confirmar devolução'}
                  </Button>
                </div>
              )}
            </Card>
          )
        })}
        {vendas.length === 0 && (
          <Card className="p-5 text-ink-light">Nenhuma venda no expediente aberto.</Card>
        )}
      </div>
    </main>
  )
}
