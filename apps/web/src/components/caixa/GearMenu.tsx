'use client'

import {
  BarChart3,
  CalendarClock,
  History,
  LockKeyhole,
  LogOut,
  Package,
  PlusCircle,
  Power,
  Receipt,
  RotateCcw,
  Settings,
  Tags,
  TrendingDown,
  Users,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type ReactNode, useState } from 'react'
import { ContasTipoModal } from '@/components/contas/ContasTipoModal'
import { clearTokens } from '@/lib/auth'
import { cn } from '@/lib/utils'

// Papéis (iguais aos do menu do AppShell) para filtrar a visibilidade por perfil.
const STAFF = ['responsavel_emporio', 'admin']
const CONSULTA = ['responsavel_emporio', 'presidencia', 'representante_nucleo', 'tesoureiro_1', 'tesoureiro_2', 'admin']
const TESOURARIA = ['responsavel_emporio', 'tesoureiro_1', 'tesoureiro_2', 'admin']

type Item = {
  label: string
  icon: LucideIcon
  roles: string[]
  href?: string
  action?: 'sangria' | 'suprimento' | 'fechar' | 'abrir' | 'contas'
  danger?: boolean
}

export function GearMenu({
  role,
  caixaAberto,
  onAbrir,
  onSangria,
  onSuprimento,
  onFechar,
}: {
  role: string
  caixaAberto: boolean
  onAbrir?: () => void
  onSangria?: () => void
  onSuprimento?: () => void
  onFechar?: () => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [contasOpen, setContasOpen] = useState(false)

  const close = () => setOpen(false)
  const sair = () => {
    clearTokens()
    router.replace('/login')
  }

  const acoes: Record<string, (() => void) | undefined> = {
    sangria: onSangria,
    suprimento: onSuprimento,
    fechar: onFechar,
    abrir: onAbrir,
    contas: () => setContasOpen(true),
  }

  // Estrutura orientada por dados; cada item declara os papéis que o enxergam.
  const grupos: { title: string; itens: Item[] }[] = [
    {
      title: 'Caixa',
      itens: caixaAberto
        ? [
            { label: 'Sangria', icon: TrendingDown, roles: STAFF, action: 'sangria' },
            { label: 'Suprimento', icon: PlusCircle, roles: STAFF, action: 'suprimento' },
            { label: 'Devoluções', icon: RotateCcw, roles: STAFF, href: '/devolucoes' },
            { label: 'Fechar expediente', icon: LockKeyhole, roles: STAFF, action: 'fechar' },
          ]
        : [{ label: 'Abrir caixa', icon: Power, roles: STAFF, action: 'abrir' }],
    },
    {
      title: 'Cadastros',
      itens: [
        { label: 'Produtos', icon: Package, roles: STAFF, href: '/produtos' },
        { label: 'Categorias', icon: Tags, roles: STAFF, href: '/categorias' },
        { label: 'Contas', icon: Users, roles: STAFF, action: 'contas' },
      ],
    },
    {
      title: 'Consultas',
      itens: [
        { label: 'Consultar vendas', icon: Receipt, roles: STAFF, href: '/vendas' },
        { label: 'Relatórios', icon: BarChart3, roles: CONSULTA, href: '/relatorios' },
        { label: 'Histórico', icon: History, roles: CONSULTA, href: '/historico' },
      ],
    },
    {
      title: 'Empório',
      itens: [
        { label: 'Fechamento do crediário', icon: CalendarClock, roles: TESOURARIA, href: '/corte' },
        { label: 'Configurações', icon: Settings, roles: STAFF, href: '/configuracoes' },
      ],
    },
  ]

  const visiveis = grupos
    .map((g) => ({ ...g, itens: g.itens.filter((i) => i.roles.includes(role)) }))
    .filter((g) => g.itens.length > 0)

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-11 w-11 items-center justify-center rounded-lg border border-line text-ink-muted transition-colors hover:bg-canvas hover:text-ink',
          open && 'bg-canvas text-ink',
        )}
      >
        <Settings size={20} />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={close}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div className="absolute right-0 z-40 mt-2 w-64 origin-top-right animate-in fade-in slide-in-from-top-1 overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-xl">
            {visiveis.map((g) => (
              <div key={g.title} className="border-b border-line/70 pb-1.5 last:border-0 last:pb-0">
                <p className="px-2.5 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-ink-light">
                  {g.title}
                </p>
                {g.itens.map((i) =>
                  i.href ? (
                    <ItemRow key={i.label} icon={i.icon} href={i.href} onClick={close}>
                      {i.label}
                    </ItemRow>
                  ) : (
                    <ItemRow
                      key={i.label}
                      icon={i.icon}
                      onClick={() => {
                        close()
                        acoes[i.action as string]?.()
                      }}
                    >
                      {i.label}
                    </ItemRow>
                  ),
                )}
              </div>
            ))}

            <div className="mt-1.5 border-t border-line/70 pt-1.5">
              <ItemRow icon={LogOut} onClick={sair} danger>
                Sair
              </ItemRow>
            </div>
          </div>
        </>
      )}

      {contasOpen && <ContasTipoModal onClose={() => setContasOpen(false)} />}
    </div>
  )
}

function ItemRow({
  icon: Icon,
  href,
  onClick,
  danger,
  children,
}: {
  icon: LucideIcon
  href?: string
  onClick?: () => void
  danger?: boolean
  children: ReactNode
}) {
  const cls = cn(
    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium no-underline transition-colors',
    danger
      ? 'text-danger hover:bg-danger/10'
      : 'text-ink hover:bg-brand-subtle hover:text-brand-dark',
  )
  const inner = (
    <>
      <Icon size={17} className="shrink-0 opacity-80" />
      <span className="truncate">{children}</span>
    </>
  )
  if (href) {
    return (
      <Link href={href} onClick={onClick} className={cls}>
        {inner}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  )
}
