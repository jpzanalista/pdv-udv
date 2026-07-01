'use client'

import { LogOut, Menu } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { type ReactNode, useEffect, useState } from 'react'
import { Logo } from '@/components/ui/Logo'
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/Sheet'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { api } from '@/lib/api'
import { clearTokens } from '@/lib/auth'
import { cn } from '@/lib/utils'

type NavItem = { href: string; label: string; roles: string[] }

// Navegação consolidada por perfil (substitui engrenagem/links/hub no mobile).
const NAV: NavItem[] = [
  {
    href: '/',
    label: 'Início',
    roles: ['responsavel_emporio', 'presidencia', 'representante_nucleo', 'tesoureiro_1', 'tesoureiro_2', 'admin'],
  },
  { href: '/caixa', label: 'Caixa (PDV)', roles: ['responsavel_emporio', 'admin'] },
  { href: '/produtos', label: 'Produtos', roles: ['responsavel_emporio', 'admin'] },
  { href: '/categorias', label: 'Categorias', roles: ['responsavel_emporio', 'admin'] },
  { href: '/contas', label: 'Contas', roles: ['responsavel_emporio', 'admin'] },
  { href: '/vendas', label: 'Consultar vendas', roles: ['responsavel_emporio', 'admin'] },
  {
    href: '/relatorios',
    label: 'Relatórios',
    roles: ['responsavel_emporio', 'presidencia', 'representante_nucleo', 'tesoureiro_1', 'tesoureiro_2', 'admin'],
  },
  {
    href: '/corte',
    label: 'Fechamento do crediário',
    roles: ['responsavel_emporio', 'tesoureiro_1', 'tesoureiro_2', 'admin'],
  },
  {
    href: '/historico',
    label: 'Histórico',
    roles: ['responsavel_emporio', 'presidencia', 'representante_nucleo', 'tesoureiro_1', 'tesoureiro_2', 'admin'],
  },
  { href: '/tesouraria', label: 'Tesouraria', roles: ['tesoureiro_1', 'tesoureiro_2', 'admin'] },
  { href: '/responsaveis', label: 'Responsáveis', roles: ['presidencia', 'representante_nucleo', 'admin'] },
  { href: '/configuracoes', label: 'Configurações', roles: ['responsavel_emporio', 'admin'] },
]

export function AppShell({
  title,
  children,
  fluid = false,
}: {
  title?: string
  children: ReactNode
  fluid?: boolean // true = ocupa a largura toda (telas de tabela); false = largura confortável
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [me, setMe] = useState<{ role: string; nucleoNome: string | null } | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    api<{ role: string; nucleoNome: string | null }>('/auth/me')
      .then(setMe)
      .catch(() => {})
  }, [])

  const itens = me ? NAV.filter((n) => n.roles.includes(me.role)) : []

  function sair() {
    clearTokens()
    router.replace('/login')
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-surface/95 px-3 pt-[env(safe-area-inset-top)] backdrop-blur">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            aria-label="Menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted hover:bg-canvas hover:text-ink"
          >
            <Menu size={22} />
          </SheetTrigger>
          <SheetContent>
            <SheetTitle asChild>
              <div className="mb-1 flex items-center gap-2">
                <Logo size={36} />
                <div className="leading-tight">
                  <p className="text-sm font-bold text-ink">{me?.nucleoNome ?? 'Empório'}</p>
                  <p className="text-xs text-ink-light">Ponto de venda</p>
                </div>
              </div>
            </SheetTitle>

            <nav className="mt-3 flex flex-1 flex-col gap-0.5 overflow-y-auto">
              {itens.map((n) => {
                const ativo = pathname === n.href
                return (
                  <SheetClose asChild key={n.href}>
                    <Link
                      href={n.href}
                      className={cn(
                        'rounded-lg px-3 py-2.5 text-sm font-medium no-underline',
                        ativo ? 'bg-brand-bg text-brand-dark' : 'text-ink hover:bg-canvas',
                      )}
                    >
                      {n.label}
                    </Link>
                  </SheetClose>
                )
              })}
            </nav>

            <button
              type="button"
              onClick={sair}
              className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-danger hover:bg-canvas"
            >
              <LogOut size={16} /> Sair
            </button>
          </SheetContent>
        </Sheet>

        <Logo size={26} className="shrink-0" />
        <span className="truncate text-base font-bold text-brand">
          {title ?? me?.nucleoNome ?? 'Empório'}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      <main
        className={cn(
          'mx-auto w-full flex-1 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4',
          !fluid && 'max-w-5xl',
        )}
      >
        {children}
      </main>
    </div>
  )
}
