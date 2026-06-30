'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ApiError, api } from '@/lib/api'
import { clearTokens, getToken } from '@/lib/auth'
import { landingFor } from '@/lib/nav'

type Me = { sub: string; role: string; nucleoId: string | null; nucleoNome: string | null }

type Item = {
  href: string
  titulo: string
  descricao: string
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
        papeis: ['responsavel_emporio', 'admin'],
      },
      {
        href: '/categorias',
        titulo: 'Categorias',
        descricao: 'As abas da grade de venda.',
        papeis: ['responsavel_emporio', 'admin'],
      },
      {
        href: '/contas',
        titulo: 'Contas',
        descricao: 'Sócio, visitante e institucional — importar, exportar e editar.',
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
        papeis: ['tesoureiro_1', 'tesoureiro_2', 'responsavel_emporio', 'presidencia', 'admin'],
      },
      {
        href: '/tesouraria',
        titulo: 'Tesouraria · validações',
        descricao: 'Validar sangrias pendentes e gerar recibos.',
        papeis: ['tesoureiro_1', 'tesoureiro_2', 'admin'],
      },
      {
        href: '/corte',
        titulo: 'Fechamento do crediário',
        descricao: 'Planilha mensal dos sócios para a tesouraria (Excel/PDF).',
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
      .then((m) => {
        const dest = landingFor(m.role)
        if (dest !== '/') {
          router.replace(dest) // papel tem área própria → cai direto nela
          return
        }
        setMe(m) // admin/sócio: hub é a área
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          clearTokens()
          router.replace('/login')
        }
      })
      .finally(() => setCarregando(false))
  }, [router])

  function sair() {
    clearTokens()
    router.replace('/login')
  }

  if (carregando) return <main className="p-8 text-ink-muted">Carregando…</main>
  if (!me) return null

  const secoes = MENU.map((s) => ({
    ...s,
    itens: s.itens.filter((i) => podeVer(i, me.role)),
  })).filter((s) => s.itens.length > 0)

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand">PDV UDV</h1>
        <Button variant="ghost" className="text-sm" onClick={sair}>
          Sair
        </Button>
      </div>
      <p className="mt-1 text-ink-muted">
        <b>{me.role}</b>
        {me.nucleoNome ? ` · ${me.nucleoNome}` : ''}
      </p>

      {secoes.map((secao) => (
        <section key={secao.nome} className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-light">{secao.nome}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {secao.itens.map((item) => (
              <Link key={item.href} href={item.href} className="no-underline">
                <Card className="min-h-touch-lg p-5 transition hover:border-brand hover:shadow-md">
                  <h3 className="font-semibold text-ink">{item.titulo}</h3>
                  <p className="mt-1 text-sm text-ink-muted">{item.descricao}</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}
