'use client'

import { calcularTotais, formatBRL, reaisToCents } from '@pdv-udv/core'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { AbrirCaixa } from '@/components/caixa/AbrirCaixa'
import { Cart } from '@/components/caixa/Cart'
import { FecharCaixaModal } from '@/components/caixa/FecharCaixaModal'
import { ProductGrid } from '@/components/caixa/ProductGrid'
import { QtyStepper } from '@/components/caixa/QtyStepper'
import { ReceberModal } from '@/components/caixa/ReceberModal'
import { SocioModal } from '@/components/caixa/SocioModal'
import { ApiError, api } from '@/lib/api'
import { getToken } from '@/lib/auth'
import type { CartItem, Categoria, Conta, Expediente, Ident, Produto } from '@/lib/types'

const TODOS = '__todos__'

export default function CaixaPage() {
  const router = useRouter()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [expediente, setExpediente] = useState<Expediente | null>(null)
  const [sugestaoFundo, setSugestaoFundo] = useState<number | null>(null)
  const [fecharOpen, setFecharOpen] = useState(false)
  const [carregando, setCarregando] = useState(true)

  const [activeCat, setActiveCat] = useState<string>(TODOS)
  const [qtde, setQtde] = useState(1)
  const [cart, setCart] = useState<CartItem[]>([])
  const [ident, setIdent] = useState<Ident>(null)
  const [socioOpen, setSocioOpen] = useState(false)
  const [receberOpen, setReceberOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    Promise.all([
      api<Categoria[]>('/categorias'),
      api<Produto[]>('/produtos'),
      api<Conta[]>('/contas'),
      api<{ aberto: Expediente | null; sugestaoFundoCents: number | null }>('/expedientes/atual'),
    ])
      .then(([cat, prod, cont, exp]) => {
        setCategorias(cat)
        setProdutos(prod.filter((p) => p.ativo && p.exibirVenda))
        setContas(cont)
        setExpediente(exp.aberto)
        setSugestaoFundo(exp.sugestaoFundoCents)
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) router.replace('/login')
      })
      .finally(() => setCarregando(false))
  }, [router])

  const produtosFiltrados = useMemo(
    () => (activeCat === TODOS ? produtos : produtos.filter((p) => p.categoriaId === activeCat)),
    [produtos, activeCat],
  )

  function addProduto(p: Produto) {
    setMsg(null)
    const unitario = reaisToCents(Number(p.precoVenda))
    setCart((prev) => {
      const ex = prev.find((i) => i.produtoId === p.id)
      if (ex)
        return prev.map((i) => (i.produtoId === p.id ? { ...i, qtde: i.qtde + qtde } : i))
      return [...prev, { produtoId: p.id, descricao: p.descricao, qtde, unitario }]
    })
    setQtde(1)
  }

  const inc = (id: string) =>
    setCart((p) => p.map((i) => (i.produtoId === id ? { ...i, qtde: i.qtde + 1 } : i)))
  const dec = (id: string) =>
    setCart((p) =>
      p.flatMap((i) =>
        i.produtoId === id ? (i.qtde > 1 ? [{ ...i, qtde: i.qtde - 1 }] : []) : [i],
      ),
    )
  const remove = (id: string) => setCart((p) => p.filter((i) => i.produtoId !== id))
  const clear = () => {
    setCart([])
    setIdent(null)
  }

  const totalCents = calcularTotais(cart).total

  async function confirmarVenda(metodo: string) {
    setSubmitting(true)
    try {
      const payload = {
        personKind:
          ident?.kind === 'socio' ? 'socio' : ident?.kind === 'visitante' ? 'visitante' : undefined,
        contaId: ident?.kind === 'socio' ? ident.conta.id : undefined,
        itens: cart.map((i) => ({
          produtoId: i.produtoId,
          descricao: i.descricao,
          qtde: i.qtde,
          unitarioCents: i.unitario,
        })),
        pagamentos: [{ metodo, valorCents: totalCents }],
      }
      const r = await api<{ numero: number }>('/vendas', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setMsg(`Venda #${r.numero} registrada ✓`)
      setCart([])
      setIdent(null)
      setReceberOpen(false)
    } catch {
      setMsg('Erro ao registrar a venda.')
    } finally {
      setSubmitting(false)
    }
  }

  async function abrirCaixa(fundoCents: number) {
    setSubmitting(true)
    try {
      await api('/expedientes/abrir', {
        method: 'POST',
        body: JSON.stringify({ fundoTrocoCents: fundoCents }),
      })
      const r = await api<{ aberto: Expediente | null }>('/expedientes/atual')
      setExpediente(r.aberto)
    } catch {
      setMsg('Erro ao abrir o caixa.')
    } finally {
      setSubmitting(false)
    }
  }

  async function fecharCaixa(contadoCents: number) {
    setSubmitting(true)
    try {
      const r = await api<{ diferencaCents: number }>('/expedientes/fechar', {
        method: 'POST',
        body: JSON.stringify({ valorContadoCents: contadoCents }),
      })
      setExpediente(null)
      setFecharOpen(false)
      setCart([])
      setIdent(null)
      setMsg(`Caixa fechado. Diferença: ${formatBRL(r.diferencaCents)}`)
    } catch {
      setMsg('Erro ao fechar o caixa.')
    } finally {
      setSubmitting(false)
    }
  }

  if (carregando) return <main className="p-8 text-ink-muted">Carregando caixa…</main>

  if (!expediente)
    return (
      <AbrirCaixa
        submitting={submitting}
        sugestaoFundoCents={sugestaoFundo}
        onAbrir={abrirCaixa}
      />
    )

  return (
    <main className="flex h-screen flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xl font-bold text-brand no-underline">
            PDV UDV
          </Link>
          <IdentBar
            ident={ident}
            onSocio={() => setSocioOpen(true)}
            onVisitante={() => setIdent({ kind: 'visitante' })}
            onTrocar={() => setIdent(null)}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-success sm:inline">● Caixa aberto</span>
          <button
            type="button"
            onClick={() => setFecharOpen(true)}
            className="min-h-touch rounded border border-line bg-white px-3 text-sm font-semibold text-ink-muted hover:bg-canvas"
          >
            Fechar caixa
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <section className="flex flex-1 flex-col overflow-hidden p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1">
              <Tab active={activeCat === TODOS} onClick={() => setActiveCat(TODOS)}>
                TODOS
              </Tab>
              {categorias.map((c) => (
                <Tab key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)}>
                  {c.nome}
                </Tab>
              ))}
            </div>
            <QtyStepper value={qtde} onChange={setQtde} />
          </div>
          <div className="flex-1 overflow-auto">
            <ProductGrid produtos={produtosFiltrados} onAdd={addProduto} />
          </div>
        </section>

        <aside className="flex h-64 flex-col border-t border-line bg-canvas md:h-auto md:w-80 md:border-l md:border-t-0">
          <Cart
            items={cart}
            onInc={inc}
            onDec={dec}
            onRemove={remove}
            onClear={clear}
            onReceber={() => cart.length > 0 && setReceberOpen(true)}
          />
        </aside>
      </div>

      {msg && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {msg}
        </div>
      )}

      {socioOpen && (
        <SocioModal
          contas={contas}
          onPick={(c) => {
            setIdent({ kind: 'socio', conta: c })
            setSocioOpen(false)
          }}
          onClose={() => setSocioOpen(false)}
        />
      )}

      {receberOpen && (
        <ReceberModal
          totalCents={totalCents}
          ident={ident}
          submitting={submitting}
          onConfirm={confirmarVenda}
          onClose={() => setReceberOpen(false)}
        />
      )}

      {fecharOpen && (
        <FecharCaixaModal
          esperadoCents={expediente.esperadoCents}
          submitting={submitting}
          onConfirm={fecharCaixa}
          onClose={() => setFecharOpen(false)}
        />
      )}
    </main>
  )
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-touch rounded px-3 text-sm font-semibold ${
        active ? 'bg-brand text-white' : 'bg-white text-ink-muted border border-line hover:bg-brand-subtle'
      }`}
    >
      {children}
    </button>
  )
}

function IdentBar({
  ident,
  onSocio,
  onVisitante,
  onTrocar,
}: {
  ident: Ident
  onSocio: () => void
  onVisitante: () => void
  onTrocar: () => void
}) {
  if (ident === null) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-ink-muted">Quem é?</span>
        <button
          type="button"
          onClick={onSocio}
          className="min-h-touch rounded border border-brand bg-white px-3 font-semibold text-brand"
        >
          Sócio
        </button>
        <button
          type="button"
          onClick={onVisitante}
          className="min-h-touch rounded border border-line bg-white px-3 font-semibold text-ink-muted"
        >
          Visitante
        </button>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="rounded bg-brand-bg px-2 py-1 font-semibold text-brand-dark">
        {ident.kind === 'socio' ? ident.conta.nome : 'Visitante'}
      </span>
      <button type="button" onClick={onTrocar} className="text-ink-light underline">
        trocar
      </button>
    </div>
  )
}
