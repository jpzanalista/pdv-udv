'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type ReactNode, useState } from 'react'
import { ContasTipoModal } from '@/components/contas/ContasTipoModal'
import { clearTokens } from '@/lib/auth'

export function GearMenu({
  caixaAberto,
  onAbrir,
  onSangria,
  onSuprimento,
  onFechar,
}: {
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
  const act = (fn?: () => void) => {
    close()
    fn?.()
  }
  const sair = () => {
    clearTokens()
    router.replace('/login')
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="min-h-touch rounded border border-line bg-white px-3 text-lg text-ink-muted hover:bg-canvas"
      >
        ⚙️
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
          <div className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
            <Group title="Caixa">
              {caixaAberto ? (
                <>
                  <ActionItem onClick={() => act(onSangria)}>Sangria</ActionItem>
                  <ActionItem onClick={() => act(onSuprimento)}>Suprimento</ActionItem>
                  <LinkItem href="/devolucoes" onNavigate={close}>
                    Devoluções
                  </LinkItem>
                  <ActionItem onClick={() => act(onFechar)}>Fechar expediente</ActionItem>
                </>
              ) : (
                <ActionItem onClick={() => act(onAbrir)}>Abrir caixa</ActionItem>
              )}
            </Group>
            <Group title="Cadastros">
              <LinkItem href="/produtos" onNavigate={close}>
                Produtos
              </LinkItem>
              <LinkItem href="/categorias" onNavigate={close}>
                Categorias
              </LinkItem>
              <ActionItem
                onClick={() => {
                  close()
                  setContasOpen(true)
                }}
              >
                Contas
              </ActionItem>
            </Group>
            <Group title="Consultas">
              <LinkItem href="/vendas" onNavigate={close}>
                Consultar vendas
              </LinkItem>
              <LinkItem href="/relatorios" onNavigate={close}>
                Relatórios
              </LinkItem>
              <LinkItem href="/historico" onNavigate={close}>
                Histórico
              </LinkItem>
            </Group>
            <div className="border-t border-line p-1">
              <ActionItem onClick={sair}>Sair</ActionItem>
            </div>
          </div>
        </>
      )}

      {contasOpen && <ContasTipoModal onClose={() => setContasOpen(false)} />}
    </div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-line p-1 last:border-0">
      <p className="px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-ink-light">
        {title}
      </p>
      {children}
    </div>
  )
}

const itemClass =
  'block w-full rounded px-2 py-2 text-left text-sm font-medium text-ink hover:bg-brand-subtle'

function ActionItem({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={itemClass}>
      {children}
    </button>
  )
}

function LinkItem({
  href,
  onNavigate,
  children,
}: {
  href: string
  onNavigate: () => void
  children: ReactNode
}) {
  return (
    <Link href={href} onClick={onNavigate} className={`${itemClass} no-underline`}>
      {children}
    </Link>
  )
}
