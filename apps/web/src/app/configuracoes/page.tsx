'use client'

import { BR_TIMEZONES } from '@pdv-udv/shared'
import { CalendarClock, Globe, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type ReactNode, useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Input'
import { ApiError, api } from '@/lib/api'
import { getToken } from '@/lib/auth'

const ALLOWED = ['responsavel_emporio', 'admin']

type Config = { nome: string; timezone: string; corteDia: number; corteHora: string }

export default function ConfiguracoesPage() {
  const router = useRouter()
  const [me, setMe] = useState<{ role: string } | null>(null)
  const [config, setConfig] = useState<Config | null>(null)
  const [timezone, setTimezone] = useState('America/Sao_Paulo')
  const [corteDia, setCorteDia] = useState(28)
  const [corteHora, setCorteHora] = useState('02:59')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    api<{ role: string }>('/auth/me')
      .then(async (m) => {
        setMe(m)
        if (ALLOWED.includes(m.role)) {
          const c = await api<Config>('/nucleos/config')
          setConfig(c)
          setTimezone(c.timezone)
          setCorteDia(c.corteDia)
          setCorteHora(c.corteHora)
        }
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) router.replace('/login')
      })
      .finally(() => setCarregando(false))
  }, [router])

  async function salvar() {
    setSalvando(true)
    setMsg(null)
    try {
      const c = await api<Config>('/nucleos/config', {
        method: 'PATCH',
        body: JSON.stringify({ timezone, corteDia, corteHora }),
      })
      setConfig(c)
      setMsg('Configurações salvas ✓')
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) return <main className="grid min-h-[100dvh] place-items-center text-ink-muted">Carregando…</main>
  if (me && !ALLOWED.includes(me.role))
    return (
      <AppShell title="Configurações">
        <Card className="p-6 text-ink-muted">Acesso restrito ao responsável.</Card>
      </AppShell>
    )

  const alterado =
    config?.timezone !== timezone || config?.corteDia !== corteDia || config?.corteHora !== corteHora

  return (
    <AppShell title="Configurações">
      <div className="mx-auto max-w-2xl space-y-4">
        {config && (
          <p className="text-lg font-semibold text-ink">
            {config.nome} <span className="text-sm font-normal text-ink-light">· Configurações do empório</span>
          </p>
        )}

        <Secao icon={<Globe size={18} />} titulo="Fuso horário" descricao="Usado nos comprovantes, nas datas de Consultar Vendas e nos relatórios.">
          <Field label="Fuso" htmlFor="tz">
            <select
              id="tz"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="min-h-touch w-full rounded-lg border border-line bg-surface px-3 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
            >
              {BR_TIMEZONES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
        </Secao>

        <Secao
          icon={<CalendarClock size={18} />}
          titulo="Fechamento mensal do crediário"
          descricao="Fechamento dos sócios para a tesouraria. A hora segue o fuso acima."
        >
          <div className="flex flex-wrap gap-3">
            <Field label="Dia do fechamento" htmlFor="corte-dia">
              <Input
                id="corte-dia"
                type="number"
                min={1}
                max={28}
                value={corteDia}
                onChange={(e) => setCorteDia(Number(e.target.value))}
                className="w-28"
              />
            </Field>
            <Field label="Hora do fechamento" htmlFor="corte-hora">
              <Input
                id="corte-hora"
                type="time"
                value={corteHora}
                onChange={(e) => setCorteHora(e.target.value)}
                className="w-36"
              />
            </Field>
          </div>
          <p className="mt-3 rounded-lg bg-brand-subtle p-3 text-sm text-ink-muted">
            A janela vai do dia <strong>{corteDia}</strong> às <strong>{corteHora}</strong> do mês
            anterior até o dia <strong>{corteDia}</strong> às <strong>{corteHora}</strong> do mês
            atual.
          </p>
        </Secao>

        <div className="sticky bottom-0 flex items-center gap-3 border-t border-line bg-canvas/90 py-3 backdrop-blur">
          <Button onClick={salvar} disabled={salvando || !alterado}>
            <Save size={16} /> {salvando ? 'Salvando…' : 'Salvar alterações'}
          </Button>
          {msg && <span className="text-sm font-semibold text-success">{msg}</span>}
          {!alterado && !msg && <span className="text-sm text-ink-light">Nada alterado.</span>}
        </div>
      </div>
    </AppShell>
  )
}

function Secao({
  icon,
  titulo,
  descricao,
  children,
}: {
  icon: ReactNode
  titulo: string
  descricao: string
  children: ReactNode
}) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-bg text-brand">
          {icon}
        </span>
        <div>
          <p className="font-semibold text-ink">{titulo}</p>
          <p className="text-sm text-ink-light">{descricao}</p>
        </div>
      </div>
      {children}
    </Card>
  )
}
