'use client'

import {
  CalendarClock,
  History,
  Package,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Users,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { Card } from '@/components/ui/Card'
import { ApiError, api } from '@/lib/api'
import { clearTokens, getToken } from '@/lib/auth'

type Me = { sub: string; role: string; nucleoId: string | null; nucleoNome: string | null }

type Item = {
  href: string
  titulo: string
  descricao: string
  icon: LucideIcon
  papeis: string[] | null // null = todos
}

type Secao = {
  nome: string
  itens: Item[]
}

const MENU: Secao[] = [
  {
    nome: 'Operação',
    itens: [
      {
        href: '/caixa',
        titulo: 'Abrir caixa',
        descricao: 'Vender, receber e fechar o caixa do expediente.',
        icon: ShoppingCart,
        papeis: null,
      },
    ],
  },
  {
    nome: 'Cadastros',
    itens: [
      {
        href: '/produtos',
        titulo: 'Produtos',
        descricao: 'Cadastro, preços, estoque e exibição na venda.',
        icon: Package,
        papeis: ['responsavel_emporio', 'admin'],
      },
      {
        href: '/categorias',
        titulo: 'Categorias',
        descricao: 'As abas da grade de venda.',
        icon: Tags,
        papeis: ['responsavel_emporio', 'admin'],
      },
      {
        href: '/contas',
        titulo: 'Contas',
        descricao: 'Sócio, visitante e institucional — importar, exportar e editar.',
        icon: Users,
        papeis: ['responsavel_emporio', 'admin'],
      },
    ],
  },
  {
    nome: 'Financeiro',
    itens: [
      {
        href: '/historico',
        titulo: 'Histórico',
        descricao: 'Movimentações vitalícias, filtros e exportação.',
        icon: History,
        papeis: ['tesoureiro_1', 'tesoureiro_2', 'responsavel_emporio', 'presidencia', 'admin'],
      },
      {
        href: '/tesouraria',
        titulo: 'Tesouraria · validações',
        descricao: 'Validar sangrias pendentes e gerar recibos.',
        icon: ShieldCheck,
        papeis: ['tesoureiro_1', 'tesoureiro_2', 'admin'],
      },
      {
        href: '/corte',
        titulo: 'Fechamento do crediário',
        descricao: 'Planilha mensal dos sócios para a tesouraria (Excel/PDF).',
        icon: CalendarClock,
        papeis: ['tesoureiro_1', 'tesoureiro_2', 'responsavel_emporio', 'admin'],
      },
    ],
  },
]

function podeVer(item: Item, role: string) {
  return item.papeis === null || item.papeis.includes(role)
}

export default function Home() {
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    api<Me>('/auth/me')
      .then(setMe) // hub aberto a todos; o login já leva cada papel à sua área
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          clearTokens()
          router.replace('/login')
        }
      })
      .finally(() => setCarregando(false))
  }, [router])

  if (carregando)
    return <main className="grid min-h-[100dvh] place-items-center text-ink-muted">Carregando…</main>
  if (!me) return null

  const secoes = MENU.map((s) => ({
    ...s,
    itens: s.itens.filter((i) => podeVer(i, me.role)),
  })).filter((s) => s.itens.length > 0)

  return (
    <AppShell title="Início">
      <div className="border-b border-line pb-4">
        <h1 className="text-2xl font-bold text-ink">{me.nucleoNome ?? 'Empório'}</h1>
        <p className="mt-1 text-base text-ink-muted">
          <span className="font-semibold text-ink">{me.role}</span>
          {me.nucleoNome ? ` · ${me.nucleoNome}` : ''}
        </p>
      </div>

      {secoes.map((secao) => (
        <section key={secao.nome} className="mt-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-light">
            {secao.nome}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {secao.itens.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href} className="no-underline">
                  <Card className="flex h-full items-start gap-3 p-5 transition hover:border-brand hover:shadow-md active:scale-[0.99]">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-bg text-brand">
                      <Icon size={22} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-bold text-ink">{item.titulo}</h3>
                      <p className="mt-1 text-sm text-ink-muted">{item.descricao}</p>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </AppShell>
  )
}
