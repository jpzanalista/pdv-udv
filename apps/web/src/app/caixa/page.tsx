'use client'

import { calcularTotais, formatBRL, reaisToCents } from '@pdv-udv/core'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { AbrirCaixaModal } from '@/components/caixa/AbrirCaixaModal'
import { Cart } from '@/components/caixa/Cart'
import { FecharCaixaModal } from '@/components/caixa/FecharCaixaModal'
import { GearMenu } from '@/components/caixa/GearMenu'
import { MovimentoModal, type MovimentoPayload } from '@/components/caixa/MovimentoModal'
import { ProductGrid } from '@/components/caixa/ProductGrid'
import { QtyStepper } from '@/components/caixa/QtyStepper'
import { ReceberModal, type ReceberPayload } from '@/components/caixa/ReceberModal'
import { ApiError, api } from '@/lib/api'
import { getToken } from '@/lib/auth'
import type { CartItem, Categoria, Conta, Expediente, Produto } from '@/lib/types'

const TODOS = '__todos__'

export default function CaixaPage() {
  const router = useRouter()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [expediente, setExpediente] = useState<Expediente | null>(null)
  const [sugestaoFundo, setSugestaoFundo] = useState<number | null>(null)
  const [fecharOpen, setFecharOpen] = useState(false)
  const [abrirOpen, setAbrirOpen] = useState(false)
  const [receberAposAbrir, setReceberAposAbrir] = useState(false)
  const [movimentoTipo, setMovimentoTipo] = useState<'sangria' | 'suprimento' | null>(null)
  const [carregando, setCarregando] = useState(true)

  const [activeCat, setActiveCat] = useState<string>(TODOS)
  const [qtde, setQtde] = useState(1)
  const [cart, setCart] = useState<CartItem[]>([])
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
  const clear = () => setCart([])

  const totalCents = calcularTotais(cart).total

  async function carregarContas() {
    try {
      setContas(await api<Conta[]>('/contas'))
    } catch {
      // silencioso — a lista atual continua válida
    }
  }

  // A identificação (sócio/visitante/institucional) é decidida no Receber.
  async function confirmarVenda(p: ReceberPayload) {
    setSubmitting(true)
    try {
      let contaId = p.contaId
      if (p.novaConta) {
        const c = await api<{ id: string }>('/contas', {
          method: 'POST',
          body: JSON.stringify(p.novaConta),
        })
        contaId = c.id
      }
      const descontoCents = Math.min(totalCents, p.descontoCents ?? 0)
      const payload = {
        personKind: p.personKind,
        contaId,
        descontoCents: descontoCents || undefined,
        itens: cart.map((i) => ({
          produtoId: i.produtoId,
          descricao: i.descricao,
          qtde: i.qtde,
          unitarioCents: i.unitario,
        })),
        pagamentos: [{ metodo: p.metodo, valorCents: totalCents - descontoCents }],
      }
      const r = await api<{ numero: number }>('/vendas', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setMsg(`Venda #${r.numero} registrada ✓`)
      setCart([])
      setReceberOpen(false)
      if (p.novaConta) await carregarContas() // conta nova aparece nas próximas vendas
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
      setAbrirOpen(false)
      if (receberAposAbrir && cart.length > 0) setReceberOpen(true) // emenda venda
      setReceberAposAbrir(false)
    } catch {
      setMsg('Erro ao abrir o caixa.')
    } finally {
      setSubmitting(false)
    }
  }

  function pedirReceber() {
    if (cart.length === 0) return
    if (!expediente) {
      setReceberAposAbrir(true) // caixa fechado: abre a abertura e emenda o Receber
      setAbrirOpen(true)
      return
    }
    setReceberOpen(true)
  }

  async function pedirFechamento() {
    try {
      const r = await api<{ aberto: Expediente | null }>('/expedientes/atual')
      if (!r.aberto) {
        setExpediente(null)
        setMsg('O caixa não está aberto.')
        return
      }
      setExpediente(r.aberto) // esperado atualizado (inclui vendas após a abertura)
      setFecharOpen(true)
    } catch {
      setMsg('Erro ao carregar o fechamento.')
    }
  }

  async function abrirMovimento(tipo: 'sangria' | 'suprimento') {
    try {
      const r = await api<{ aberto: Expediente | null }>('/expedientes/atual')
      if (!r.aberto) {
        setExpediente(null)
        setMsg('O caixa não está aberto.')
        return
      }
      setExpediente(r.aberto) // valor em caixa atualizado
      setMovimentoTipo(tipo)
    } catch {
      setMsg('Erro ao carregar o caixa.')
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
      setMsg(`Caixa fechado. Diferença: ${formatBRL(r.diferencaCents)}`)
    } catch {
      setMsg('Erro ao fechar o caixa.')
    } finally {
      setSubmitting(false)
    }
  }

  async function registrarMovimento(p: MovimentoPayload) {
    setSubmitting(true)
    try {
      const mov = await api<{ id: string }>('/expedientes/movimentos', {
        method: 'POST',
        body: JSON.stringify(p),
      })
      setMovimentoTipo(null)
      if (p.tipo === 'sangria' && p.destino === 'compra') {
        window.open(`/caixa/recibo/${mov.id}`, '_blank')
        setMsg('Sangria (compra) registrada — recibo aberto.')
      } else if (p.tipo === 'sangria') {
        setMsg('Sangria p/ tesouraria registrada (pendente de validação).')
      } else {
        setMsg('Suprimento registrado.')
      }
    } catch {
      setMsg('Erro ao registrar o movimento.')
    } finally {
      setSubmitting(false)
    }
  }

  if (carregando) return <main className="p-8 text-ink-muted">Carregando caixa…</main>

  return (
    <main className="flex h-screen flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-brand">PDV UDV</span>
        </div>
        <div className="flex items-center gap-2">
          <CaixaStatus aberto={!!expediente} />
          <GearMenu
            caixaAberto={!!expediente}
            onAbrir={() => setAbrirOpen(true)}
            onSangria={() => abrirMovimento('sangria')}
            onSuprimento={() => abrirMovimento('suprimento')}
            onFechar={pedirFechamento}
          />
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
            onReceber={pedirReceber}
          />
        </aside>
      </div>

      {msg && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {msg}
        </div>
      )}

      {receberOpen && (
        <ReceberModal
          totalCents={totalCents}
          contas={contas}
          submitting={submitting}
          onConfirm={confirmarVenda}
          onClose={() => setReceberOpen(false)}
        />
      )}

      {abrirOpen && (
        <AbrirCaixaModal
          submitting={submitting}
          sugestaoFundoCents={sugestaoFundo}
          onAbrir={abrirCaixa}
          onClose={() => {
            setAbrirOpen(false)
            setReceberAposAbrir(false)
          }}
        />
      )}

      {fecharOpen && expediente && (
        <FecharCaixaModal
          esperadoCents={expediente.esperadoCents}
          submitting={submitting}
          onConfirm={fecharCaixa}
          onClose={() => setFecharOpen(false)}
        />
      )}

      {movimentoTipo && expediente && (
        <MovimentoModal
          tipo={movimentoTipo}
          esperadoCents={expediente.esperadoCents}
          submitting={submitting}
          onConfirm={registrarMovimento}
          onClose={() => setMovimentoTipo(null)}
        />
      )}
    </main>
  )
}

function CaixaStatus({ aberto }: { aberto: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-white ${
        aberto
          ? 'bg-success shadow-[0_0_12px_2px_rgba(39,174,96,0.75)]'
          : 'bg-danger shadow-[0_0_12px_2px_rgba(231,76,60,0.75)]'
      }`}
    >
      {aberto ? 'Caixa Aberto' : 'Caixa Fechado'}
    </span>
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

