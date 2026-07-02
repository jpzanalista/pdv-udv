'use client'

import { Eye } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getToken, impLabel, sairObservacao } from '@/lib/auth'

/** Faixa fixa quando a aba está em "observação" (impersonation do gestor). */
export function ObservacaoBanner() {
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    getToken() // garante a captura do token vindo por #imp=
    setLabel(impLabel())
  }, [])

  if (!label) return null
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-warning px-4 py-2 text-sm font-semibold text-black shadow-[0_-4px_16px_rgba(0,0,0,0.18)]">
      <span className="inline-flex items-center gap-1.5">
        <Eye size={16} /> Observando: {label} · somente leitura
      </span>
      <button
        type="button"
        onClick={() => {
          sairObservacao()
          window.close()
        }}
        className="rounded bg-black/20 px-3 py-1 hover:bg-black/30"
      >
        Sair da observação
      </button>
    </div>
  )
}
