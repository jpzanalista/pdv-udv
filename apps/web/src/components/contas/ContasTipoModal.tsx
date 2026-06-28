import Link from 'next/link'
import { Card } from '@/components/ui/Card'

const OPCOES = [
  { tipo: 'socio', label: 'Contas Sócio', desc: 'Sócios com crediário (individual ou família).' },
  { tipo: 'visitante', label: 'Contas Visitante', desc: 'Não-sócios — pagam no fim do expediente.' },
  { tipo: 'institucional', label: 'Contas Institucional', desc: 'Consumo do próprio núcleo.' },
]

export function ContasTipoModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <Card className="w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-lg font-semibold text-brand">Contas</h2>
        <div className="flex flex-col gap-2">
          {OPCOES.map((o) => (
            <Link
              key={o.tipo}
              href={`/contas?tipo=${o.tipo}`}
              onClick={onClose}
              className="rounded-lg border border-line p-3 no-underline hover:border-brand hover:bg-brand-subtle"
            >
              <span className="block font-semibold text-ink">{o.label}</span>
              <span className="block text-sm text-ink-muted">{o.desc}</span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  )
}
