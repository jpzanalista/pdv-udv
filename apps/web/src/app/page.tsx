'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ApiError, api } from '@/lib/api'
import { clearTokens, getToken } from '@/lib/auth'

type Me = { sub: string; role: string; nucleoId: string | null; nucleoNome: string | null }

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
      .then(setMe)
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

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand">PDV UDV</h1>
        <Button variant="ghost" className="text-sm" onClick={sair}>
          Sair
        </Button>
      </div>
      <Card className="mt-4 p-5">
        <h2 className="mb-2 font-semibold">Você está autenticado ✓</h2>
        <ul className="text-ink-muted">
          <li>
            <b>Papel:</b> {me.role}
          </li>
          <li>
            <b>Núcleo:</b> {me.nucleoNome ?? '—'}
          </li>
        </ul>
      </Card>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/caixa" className="inline-block no-underline">
          <Button className="min-h-touch-lg px-8">Abrir caixa →</Button>
        </Link>
        {['tesoureiro_1', 'tesoureiro_2', 'admin'].includes(me.role) && (
          <Link href="/tesouraria" className="inline-block no-underline">
            <Button variant="secondary" className="min-h-touch-lg px-6">
              Tesouraria · validações
            </Button>
          </Link>
        )}
      </div>
    </main>
  )
}
