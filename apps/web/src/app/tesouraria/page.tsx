'use client'

import { formatBRL, reaisToCents } from '@pdv-udv/core'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ApiError, api } from '@/lib/api'
import { getToken } from '@/lib/auth'

type Me = { role: string }
type Pendente = { id: string; valor: string; descricao: string | null; createdAt: string }

const TES = ['tesoureiro_1', 'tesoureiro_2', 'admin']

export default function TesourariaPage() {
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)
  const [pendentes, setPendentes] = useState<Pendente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [validando, setValidando] = useState<string | null>(null)

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    api<Me>('/auth/me')
      .then((m) => {
        setMe(m)
        if (TES.includes(m.role)) {
          return api<Pendente[]>('/expedientes/movimentos/pendentes').then(setPendentes)
        }
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) router.replace('/login')
      })
      .finally(() => setCarregando(false))
  }, [router])

  async function validar(id: string) {
    setValidando(id)
    setErro(null)
    try {
      await api(`/expedientes/movimentos/${id}/validar`, { method: 'POST' })
      setPendentes((p) => p.filter((x) => x.id !== id))
      window.open(`/caixa/recibo/${id}`, '_blank')
    } catch {
      setErro('Não foi possível validar.')
    } finally {
      setValidando(null)
    }
  }

  if (carregando) return <main className="p-8 text-ink-muted">Carregando…</main>

  if (me && !TES.includes(me.role))
    return (
      <main className="p-8">
        <h1 className="text-xl font-bold text-brand">Tesouraria</h1>
        <p className="mt-2 text-ink-muted">Acesso restrito aos tesoureiros.</p>
        <Link href="/" className="mt-2 inline-block text-brand">
          ← início
        </Link>
      </main>
    )

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand">Tesouraria · validações</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/historico" className="text-brand">
            Histórico
          </Link>
          <Link href="/corte" className="text-brand">
            Fechamento
          </Link>
          <Link href="/" className="text-ink-muted">
            ← início
          </Link>
        </div>
      </div>
      <p className="mt-1 text-ink-muted">Sangrias para a tesouraria aguardando validação.</p>
      {erro && <p className="mt-2 text-danger">{erro}</p>}

      <div className="mt-4 space-y-2">
        {pendentes.length === 0 && (
          <Card className="p-5 text-ink-light">Nenhuma sangria pendente. 🎉</Card>
        )}
        {pendentes.map((m) => (
          <Card key={m.id} className="flex items-center gap-3 p-4">
            <div className="flex-1">
              <p className="font-bold text-ink">{formatBRL(reaisToCents(Number(m.valor)))}</p>
              <p className="text-sm text-ink-muted">
                {m.descricao ?? 'Sangria para tesouraria'} ·{' '}
                {new Date(m.createdAt).toLocaleString('pt-BR')}
              </p>
            </div>
            <Button onClick={() => validar(m.id)} disabled={validando === m.id}>
              {validando === m.id ? 'Validando…' : 'Validar'}
            </Button>
          </Card>
        ))}
      </div>
    </main>
  )
}
