'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'

const OPCOES = [
  { id: 'light', label: 'Claro', Icon: Sun },
  { id: 'dark', label: 'Escuro', Icon: Moon },
  { id: 'system', label: 'Automático', Icon: Monitor },
] as const

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [montado, setMontado] = useState(false)
  useEffect(() => setMontado(true), [])

  // antes de montar, evita flash de ícone errado
  const Atual = !montado ? Sun : resolvedTheme === 'dark' ? Moon : Sun

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Tema"
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-line text-ink-muted hover:bg-canvas hover:text-ink"
      >
        <Atual size={18} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {OPCOES.map(({ id, label, Icon }) => (
          <DropdownMenuItem
            key={id}
            onSelect={() => setTheme(id)}
            className={theme === id ? 'text-brand' : ''}
          >
            <Icon size={16} />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
