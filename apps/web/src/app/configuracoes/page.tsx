'use client'

import { BR_TIMEZONES } from '@pdv-udv/shared'
import { CalendarClock, Globe, Save, Store } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type ReactNode, useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Input'
import { ApiError, api } from '@/lib/api'
import { getToken } from '@/lib/auth'

const ALLOWED = ['responsavel_emporio', 'admin']

type Config = {
  nome: string
  nomeExibicao: string | null
  timezone: string
  corteDia: number
  corteHora: string
}

export default function ConfiguracoesPage() {
  const router = useRouter()
  const [me, setMe] = useState<{ role: string } | null>(null)
  const [config, setConfig] = useState<Config | null>(null)
  const [nomeExibicao, setNomeExibicao] = useState('')
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
          setNomeExibicao(c.nomeExibicao ?? '')
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
        body: JSON.stringify({ nomeExibicao: nomeExibicao.trim(), timezone, corteDia, corteHora }),
      })
      setConfig(c)
      setNomeExibicao(c.nomeExibicao ?? '')
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
    (config?.nomeExibicao ?? '') !== nomeExibicao.trim() ||
    config?.timezone !== timezone ||
    config?.corteDia !== corteDia ||
    config?.corteHora !== corteHora

  return (
    <AppShell title="Configurações" fluid>
      {/* Cabeçalho */}
      <div className="border-b border-line pb-4">
        <h1 className="text-2xl font-bold text-ink">Configurações do empório</h1>
        <p className="mt-1 text-base text-ink-muted">
          {config?.nome ?? 'Núcleo'} · Ajustes que valem para todo o PDV deste empório.
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Secao
          icon={<Store size={20} />}
          titulo="Nome do empório"
          descricao="Aparece no topo do sistema, no login e nos documentos. Vazio usa o nome oficial do núcleo."
        >
          <Field label="Nome de exibição" htmlFor="nome-exibicao">
            <Input
              id="nome-exibicao"
              value={nomeExibicao}
              onChange={(e) => setNomeExibicao(e.target.value)}
              placeholder={config?.nome ?? 'Empório'}
              maxLength={160}
              className="h-11 text-base"
            />
          </Field>
        </Secao>

        <Secao
          icon={<Globe size={20} />}
          titulo="Fuso horário"
          descricao="Usado nos comprovantes, nas datas de Consultar Vendas e nos relatórios."
        >
          <Field label="Fuso do empório" htmlFor="tz">
            <select
              id="tz"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="min-h-touch w-full rounded-lg border border-line bg-surface px-3 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
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
          icon={<CalendarClock size={20} />}
          titulo="Fechamento mensal do crediário"
          descricao="Fechamento dos sócios para a tesouraria. A hora segue o fuso ao lado."
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
                className="h-11 w-28 text-base"
              />
            </Field>
            <Field label="Hora do fechamento" htmlFor="corte-hora">
              <Input
                id="corte-hora"
                type="time"
                value={corteHora}
                onChange={(e) => setCorteHora(e.target.value)}
                className="h-11 w-36 text-base"
              />
            </Field>
          </div>
          <p className="mt-3 rounded-lg bg-brand-subtle p-3 text-sm text-ink-muted">
            A janela vai do dia <strong>{corteDia}</strong> às <strong>{corteHora}</strong> do mês
            anterior até o dia <strong>{corteDia}</strong> às <strong>{corteHora}</strong> do mês
            atual.
          </p>
        </Secao>
      </div>

      {/* Barra de salvar */}
      <div className="sticky bottom-0 mt-5 flex items-center gap-3 border-t border-line bg-canvas/90 py-3 backdrop-blur">
        <Button onClick={salvar} disabled={salvando || !alterado} className="min-h-touch-lg text-base">
          <Save size={18} /> {salvando ? 'Salvando…' : 'Salvar alterações'}
        </Button>
        {msg && <span className="text-sm font-semibold text-success">{msg}</span>}
        {!alterado && !msg && <span className="text-sm text-ink-light">Nada alterado.</span>}
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
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-bg text-brand">
          {icon}
        </span>
        <div>
          <p className="text-lg font-bold text-ink">{titulo}</p>
          <p className="text-sm text-ink-light">{descricao}</p>
        </div>
      </div>
      {children}
    </Card>
  )
}
