'use client'

import { BR_TIMEZONES } from '@pdv-udv/shared'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
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

  if (carregando) return <main className="p-8 text-ink-muted">Carregando…</main>
  if (me && !ALLOWED.includes(me.role))
    return (
      <main className="p-8">
        <h1 className="text-xl font-bold text-brand">Configurações</h1>
        <p className="mt-2 text-ink-muted">Acesso restrito ao responsável.</p>
        <Link href="/caixa" className="mt-2 inline-block text-brand">
          ← caixa
        </Link>
      </main>
    )

  const alterado =
    config?.timezone !== timezone ||
    config?.corteDia !== corteDia ||
    config?.corteHora !== corteHora

  return (
    <main className="mx-auto max-w-lg p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand">Configurações do empório</h1>
        <Link href="/caixa" className="text-sm text-ink-muted">
          ← caixa
        </Link>
      </div>
      {config && <p className="mt-1 text-ink-muted">{config.nome}</p>}

      <Card className="mt-4 p-5">
        <Field label="Fuso horário" htmlFor="tz">
          <select
            id="tz"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="min-h-touch w-full rounded border border-line bg-white px-2 text-ink"
          >
            {BR_TIMEZONES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <p className="mt-2 text-sm text-ink-light">
          Usado nos comprovantes, nas datas de Consultar Vendas e nos relatórios. Padrão: Brasília
          (São Paulo).
        </p>

        <div className="mt-5 border-t border-line pt-4">
          <p className="mb-1 font-semibold text-ink">Fechamento mensal do crediário</p>
          <p className="mb-3 text-sm text-ink-light">
            Fechamento dos sócios para a tesouraria. A hora segue o fuso acima.
          </p>
          <div className="flex flex-wrap gap-3">
            <Field label="Dia do fechamento" htmlFor="corte-dia">
              <Input
                id="corte-dia"
                type="number"
                min={1}
                max={28}
                value={corteDia}
                onChange={(e) => setCorteDia(Number(e.target.value))}
                className="w-24"
              />
            </Field>
            <Field label="Hora do fechamento" htmlFor="corte-hora">
              <Input
                id="corte-hora"
                type="time"
                value={corteHora}
                onChange={(e) => setCorteHora(e.target.value)}
                className="w-32"
              />
            </Field>
          </div>
          <p className="mt-2 text-sm text-ink-light">
            A janela vai do dia {corteDia} às {corteHora} do mês anterior até o dia {corteDia} às{' '}
            {corteHora} do mês atual.
          </p>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Button onClick={salvar} disabled={salvando || !alterado}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </Button>
          {msg && <span className="text-sm font-semibold text-ink">{msg}</span>}
        </div>
      </Card>
    </main>
  )
}
