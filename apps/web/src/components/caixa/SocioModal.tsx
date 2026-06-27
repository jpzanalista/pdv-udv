import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import type { Conta } from '@/lib/types'

export function SocioModal({
  contas,
  onPick,
  onClose,
}: {
  contas: Conta[]
  onPick: (c: Conta) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const filtradas = useMemo(() => {
    const t = q.trim().toLowerCase()
    const base = t ? contas.filter((c) => c.nome.toLowerCase().includes(t)) : contas
    return base.slice(0, 50)
  }, [q, contas])

  return (
    <div
      className="fixed inset-0 z-10 flex items-start justify-center bg-black/40 p-4 pt-20"
      onClick={onClose}
    >
      <Card
        className="flex max-h-[70vh] w-full max-w-md flex-col p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Identificar sócio</h2>
          <button type="button" onClick={onClose} className="px-2 text-ink-light">
            ✕
          </button>
        </div>
        <Input
          autoFocus
          placeholder="Buscar por nome…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <ul className="mt-3 flex-1 divide-y divide-line overflow-auto">
          {filtradas.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onPick(c)}
                className="min-h-touch w-full px-1 py-2 text-left hover:bg-brand-subtle"
              >
                {c.nome}
              </button>
            </li>
          ))}
          {filtradas.length === 0 && <li className="p-3 text-ink-light">Nenhuma conta encontrada.</li>}
        </ul>
      </Card>
    </div>
  )
}
