'use client'

import { formatBRL, reaisToCents } from '@pdv-udv/core'
import { BadgeCheck, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ApiError, api } from '@/lib/api'
import { getToken } from '@/lib/auth'
import { fmtDataHora } from '@/lib/datahora'

type Me = { role: string; timezone: string }
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

  if (carregando)
    return <main className="grid min-h-[100dvh] place-items-center text-ink-muted">Carregando…</main>
  if (me && !TES.includes(me.role))
    return (
      <AppShell title="Tesouraria">
        <Card className="p-6 text-ink-muted">Acesso restrito aos tesoureiros.</Card>
      </AppShell>
    )

  return (
    <AppShell title="Tesouraria">
      <div className="mx-auto max-w-2xl">
        <div className="border-b border-line pb-4">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
            <BadgeCheck size={22} className="text-brand" /> Tesouraria · validações
          </h1>
          <p className="mt-1 text-base text-ink-muted">
            Sangrias para a tesouraria aguardando validação. Ao validar, o recibo abre para impressão.
          </p>
        </div>

        {erro && <p className="mt-3 text-sm font-semibold text-danger">{erro}</p>}

        <div className="mt-4 space-y-2">
          {pendentes.length === 0 && (
            <Card className="flex items-center gap-2 p-6 text-ink-muted">
              <CheckCircle2 size={18} className="text-success" /> Nenhuma sangria pendente.
            </Card>
          )}
          {pendentes.map((m) => (
            <Card key={m.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-ink">{formatBRL(reaisToCents(Number(m.valor)))}</p>
                <p className="mt-0.5 text-sm text-ink-muted">
                  {m.descricao ?? 'Sangria para tesouraria'} · {fmtDataHora(m.createdAt, me?.timezone)}
                </p>
              </div>
              <Button
                className="min-h-touch-lg shrink-0"
                onClick={() => validar(m.id)}
                disabled={validando === m.id}
              >
                <BadgeCheck size={16} /> {validando === m.id ? 'Validando…' : 'Validar'}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
