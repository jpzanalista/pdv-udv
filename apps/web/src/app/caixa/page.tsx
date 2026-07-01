'use client'

import { calcularTotais, formatBRL, reaisToCents } from '@pdv-udv/core'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AbrirCaixaModal } from '@/components/caixa/AbrirCaixaModal'
import { Cart } from '@/components/caixa/Cart'
import { FecharCaixaModal } from '@/components/caixa/FecharCaixaModal'
import { GearMenu } from '@/components/caixa/GearMenu'
import { MovimentoModal, type MovimentoPayload } from '@/components/caixa/MovimentoModal'
import { ProductGrid } from '@/components/caixa/ProductGrid'
import { QtyStepper } from '@/components/caixa/QtyStepper'
import { ReceberModal, type ReceberPayload } from '@/components/caixa/ReceberModal'
import { ReciboModal, type ReciboData } from '@/components/caixa/ReciboModal'
import { Input } from '@/components/ui/Input'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { ApiError, api } from '@/lib/api'
import { getToken } from '@/lib/auth'
import { useDesktopAutoFocus } from '@/lib/focus'
import type { CartItem, Categoria, Conta, Expediente, Produto } from '@/lib/types'

const TODOS = '__todos__'

export default function CaixaPage() {
  const router = useRouter()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [expediente, setExpediente] = useState<Expediente | null>(null)
  const [sugestaoFundo, setSugestaoFundo] = useState<number | null>(null)
  const [role, setRole] = useState<string>('')
  const [fecharOpen, setFecharOpen] = useState(false)
  const [abrirOpen, setAbrirOpen] = useState(false)
  const [receberAposAbrir, setReceberAposAbrir] = useState(false)
  const [movimentoTipo, setMovimentoTipo] = useState<'sangria' | 'suprimento' | null>(null)
  const [carregando, setCarregando] = useState(true)

  const [activeCat, setActiveCat] = useState<string>(TODOS)
  const [busca, setBusca] = useState('')
  const [qtde, setQtde] = useState(1)
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false) // bottom-sheet do carrinho (mobile)
  const [receberOpen, setReceberOpen] = useState(false)
  const [recibo, setRecibo] = useState<ReciboData | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const buscaRef = useRef<HTMLInputElement>(null)
  // Foca a busca só no desktop e após a tela carregar (evita teclado no mobile).
  useDesktopAutoFocus(buscaRef, !carregando)

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
      api<{ role: string }>('/auth/me'),
    ])
      .then(([cat, prod, cont, exp, me]) => {
        setCategorias(cat)
        setProdutos(prod.filter((p) => p.ativo && p.exibirVenda))
        setContas(cont)
        setExpediente(exp.aberto)
        setSugestaoFundo(exp.sugestaoFundoCents)
        setRole(me.role)
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) router.replace('/login')
      })
      .finally(() => setCarregando(false))
  }, [router])

  const produtosFiltrados = useMemo(() => {
    const q = busca
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
    return produtos.filter((p) => {
      if (activeCat !== TODOS && p.categoriaId !== activeCat) return false
      if (!q) return true
      const alvo = `${p.descricao} ${p.codigo ?? ''} ${p.codigoBarras ?? ''}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
      return alvo.includes(q)
    })
  }, [produtos, activeCat, busca])

  const { total: totalCart } = calcularTotais(cart)
  const qtdItensCart = cart.reduce((s, i) => s + i.qtde, 0)

  const modalAberto = receberOpen || abrirOpen || fecharOpen || !!movimentoTipo || !!recibo

  // Atalhos: F12 Receber · F11 Cancelar · F3 buscar (desligados com modal aberto).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (modalAberto) return
      if (e.key === 'F12') {
        e.preventDefault()
        pedirReceber()
      } else if (e.key === 'F11') {
        e.preventDefault()
        clear()
      } else if (e.key === 'F3') {
        e.preventDefault()
        buscaRef.current?.focus()
        buscaRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalAberto, expediente, cart.length])

  /** Enter na busca: adiciona por código de barras/código exato, ou o único resultado (scanner). */
  function onBuscaEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const q = busca.trim()
    if (!q) return
    const exato = produtos.find((p) => p.codigoBarras === q || p.codigo === q)
    const alvo = exato ?? (produtosFiltrados.length === 1 ? produtosFiltrados[0] : undefined)
    if (alvo) {
      addProduto(alvo)
      setBusca('')
    }
  }

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
      const r = await api<{ id: string; numero: number; reciboTelefone: string | null }>('/vendas', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      // Snapshot do recibo (cliente vem da conta existente ou da conta criada na hora).
      const contaExistente = contaId ? contas.find((c) => c.id === contaId) : undefined
      const clienteNome = p.novaConta?.nome ?? contaExistente?.nome ?? null
      const clienteTipo = p.novaConta?.tipo ?? contaExistente?.tipo ?? null
      const liquidoCents = totalCents - descontoCents
      setRecibo({
        vendaId: r.id,
        numero: r.numero,
        itens: cart.map((i) => ({
          descricao: i.descricao,
          qtde: i.qtde,
          totalCents: Math.round(i.qtde * i.unitario),
        })),
        subtotalCents: totalCents,
        descontoCents,
        totalCents: liquidoCents,
        metodo: p.metodo,
        clienteNome,
        clienteTipo,
        telefone: r.reciboTelefone ?? p.novaConta?.whatsapp ?? null,
      })
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

  if (carregando)
    return <main className="grid h-[100dvh] place-items-center text-ink-muted">Carregando caixa…</main>

  return (
    <main className="flex h-[100dvh] flex-col bg-canvas">
      <header className="flex items-center justify-between gap-2 border-b border-line bg-surface px-3 pt-[env(safe-area-inset-top)] py-2 sm:gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand text-xs font-bold text-white">
            NSS
          </span>
          <span className="truncate text-base font-bold text-brand sm:text-lg">PDV UDV</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <CaixaStatus aberto={!!expediente} />
          <ThemeToggle />
          <GearMenu
            role={role}
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
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <Input
              ref={buscaRef}
              name="busca-produto"
              type="search"
              inputMode="search"
              autoComplete="off"
              aria-label="Buscar ou bipar código do produto"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={onBuscaEnter}
              placeholder="🔎 Buscar / bipar código  (F3)"
              className="h-11 flex-1 text-base sm:min-w-[16rem] sm:max-w-md"
            />
            <QtyStepper value={qtde} onChange={setQtde} />
          </div>
          <div className="-mx-3 mb-3 flex gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            <Tab active={activeCat === TODOS} onClick={() => setActiveCat(TODOS)}>
              TODOS
            </Tab>
            {categorias.map((c) => (
              <Tab
                key={c.id}
                active={activeCat === c.id}
                onClick={() => setActiveCat((prev) => (prev === c.id ? TODOS : c.id))}
              >
                {c.nome}
              </Tab>
            ))}
          </div>
          <div className="flex-1 overflow-auto pb-20 md:pb-0">
            <ProductGrid produtos={produtosFiltrados} onAdd={addProduto} />
          </div>
        </section>

        {/* Desktop: carrinho lateral fixo */}
        <aside className="hidden flex-col border-line bg-surface md:flex md:w-96 md:border-l">
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

      {/* Mobile: barra inferior fixa que abre o carrinho em bottom-sheet */}
      <button
        type="button"
        onClick={() => setCartOpen(true)}
        className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-3 border-t border-line bg-brand px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-white shadow-[0_-4px_16px_rgba(0,0,0,0.12)] md:hidden"
      >
        <span className="grid h-9 min-w-9 place-items-center rounded-full bg-white/20 px-2 text-sm font-bold">
          {qtdItensCart}
        </span>
        <span className="text-base font-semibold">Ver carrinho</span>
        <span className="ml-auto text-xl font-extrabold">{formatBRL(totalCart)}</span>
      </button>

      {/* Bottom-sheet do carrinho (mobile) */}
      {cartOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal>
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setCartOpen(false)}
            className="absolute inset-0 bg-black/40 animate-in fade-in"
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-2xl animate-in slide-in-from-bottom">
            <div className="flex justify-center pt-2">
              <span className="h-1.5 w-10 rounded-full bg-line" />
            </div>
            <Cart
              items={cart}
              onInc={inc}
              onDec={dec}
              onRemove={remove}
              onClear={() => {
                clear()
                setCartOpen(false)
              }}
              onReceber={() => {
                setCartOpen(false)
                pedirReceber()
              }}
            />
          </div>
        </div>
      )}

      {msg && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white shadow-lg md:bottom-4">
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

      {recibo && <ReciboModal recibo={recibo} onClose={() => setRecibo(null)} />}

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
      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white sm:px-3 sm:text-xs ${
        aberto
          ? 'bg-success shadow-[0_0_8px_1px_rgba(39,174,96,0.7)] sm:shadow-[0_0_12px_2px_rgba(39,174,96,0.75)]'
          : 'bg-danger shadow-[0_0_8px_1px_rgba(231,76,60,0.7)] sm:shadow-[0_0_12px_2px_rgba(231,76,60,0.75)]'
      }`}
    >
      <span className="sm:hidden">{aberto ? 'Aberto' : 'Fechado'}</span>
      <span className="hidden sm:inline">{aberto ? 'Caixa Aberto' : 'Caixa Fechado'}</span>
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
      className={`min-h-[40px] shrink-0 whitespace-nowrap rounded-full border px-3.5 text-sm font-semibold transition-colors sm:min-h-touch sm:px-4 sm:text-base ${
        active ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-ink-muted hover:bg-canvas'
      }`}
    >
      {children}
    </button>
  )
}

