'use client'

import { formatBRL, reaisToCents } from '@pdv-udv/core'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'

type Movimento = {
  id: string
  tipo: string
  destino: string | null
  valor: string
  descricao: string | null
  recebedor: string | null
  status: string | null
  createdAt: string
  nucleoNome: string | null
}

export default function ReciboPage() {
  const { id } = useParams<{ id: string }>()
  const [mov, setMov] = useState<Movimento | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    api<Movimento>(`/expedientes/movimentos/${id}`)
      .then(setMov)
      .catch(() => setErro(true))
  }, [id])

  if (erro) return <main className="p-8 text-ink-muted">Recibo não encontrado.</main>
  if (!mov) return <main className="p-8 text-ink-muted">Carregando recibo…</main>

  const data = new Date(mov.createdAt).toLocaleString('pt-BR')

  return (
    <main className="mx-auto max-w-lg p-6">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/caixa" className="text-sm text-ink-muted">
          ← voltar ao caixa
        </Link>
        <Button onClick={() => window.print()}>Imprimir / Salvar PDF</Button>
      </div>

      <div className="rounded-lg border border-line bg-white p-8">
        <h1 className="text-center text-xl font-bold text-ink">Recibo</h1>
        {mov.nucleoNome && <p className="text-center text-ink-muted">Empório {mov.nucleoNome}</p>}
        <hr className="my-5 border-line" />

        <p className="leading-relaxed">
          Declaro que foi efetuado <b>pagamento em dinheiro do caixa</b> no valor de{' '}
          <b>{formatBRL(reaisToCents(Number(mov.valor)))}</b>
          {mov.recebedor ? (
            <>
              {' '}
              para <b>{mov.recebedor}</b>
            </>
          ) : null}
          .
        </p>
        {mov.descricao && <p className="mt-2">Referente a: {mov.descricao}</p>}
        <p className="mt-2">Data: {data}</p>

        <p className="mt-8 text-sm text-ink-light">
          Documento gerado pelo sistema — sem necessidade de assinatura.
        </p>
      </div>
    </main>
  )
}
