'use client'

import { BR_TIMEZONES } from '@pdv-udv/shared'
import { Building2, LogOut, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'
import { Switch } from '@/components/ui/Switch'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { ApiError, api } from '@/lib/api'
import { clearTokens, getToken } from '@/lib/auth'
import { cn } from '@/lib/utils'

type Resp = { email: string | null; ativo: boolean }
type NucleoRow = {
  id: string
  udvId: number | null
  nome: string
  nomeExibicao: string | null
  ativo: boolean
  timezone: string
  cnpj: string | null
  temAsaas: boolean
  regiao: string | null
  regiaoUdv: number | null
  vendas: number
  ultimaVenda: string | null
  responsaveis: Resp[]
}
type Regiao = { id: string; udvId: number | null; nome: string }

export default function AdminPage() {
  const router = useRouter()
  const [ok, setOk] = useState(false)
  const [nucleos, setNucleos] = useState<NucleoRow[]>([])
  const [regioes, setRegioes] = useState<Regiao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [novo, setNovo] = useState(false)

  const carregar = useCallback(async () => {
    setNucleos(await api<NucleoRow[]>('/gestor/nucleos'))
    setRegioes(await api<Regiao[]>('/regioes').catch(() => []))
  }, [])

  useEffect(() => {
    if (!getToken()) {
      router.replace('/admin/login')
      return
    }
    api<{ role: string }>('/auth/me')
      .then((m) => {
        if (m.role !== 'gestor_plataforma') {
          router.replace('/admin/login')
          return
        }
        setOk(true)
        return carregar()
      })
      .catch(() => router.replace('/admin/login'))
      .finally(() => setCarregando(false))
  }, [router, carregar])

  async function toggle(n: NucleoRow) {
    const nova = !n.ativo
    setNucleos((p) => p.map((x) => (x.id === n.id ? { ...x, ativo: nova } : x)))
    try {
      await api(`/gestor/nucleos/${n.id}`, { method: 'PATCH', body: JSON.stringify({ ativo: nova }) })
    } catch {
      setNucleos((p) => p.map((x) => (x.id === n.id ? { ...x, ativo: !nova } : x)))
      setMsg('Não foi possível alterar a situação.')
    }
  }

  function sair() {
    clearTokens()
    router.replace('/admin/login')
  }

  if (carregando) return <main className="grid min-h-[100dvh] place-items-center text-ink-muted">Carregando…</main>
  if (!ok) return null

  const ativos = nucleos.filter((n) => n.ativo).length

  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-surface/95 px-3 backdrop-blur">
        <Logo size={26} className="shrink-0" />
        <span className="font-bold text-brand">Plataforma</span>
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <button
            type="button"
            onClick={sair}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-danger hover:bg-canvas"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">Empórios</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {nucleos.length} núcleo(s) · {ativos} ativo(s)
            </p>
          </div>
          <Button onClick={() => setNovo(true)}>
            <Plus size={18} /> Novo empório
          </Button>
        </div>

        {msg && <p className="mt-3 text-sm font-semibold text-ink">{msg}</p>}

        {/* Desktop */}
        <Card className="mt-3 hidden overflow-hidden md:block">
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-line bg-canvas text-center text-xs font-semibold uppercase tracking-wide text-ink-light">
                <th className="px-3 py-2.5 text-left">Empório</th>
                <th className="px-3 py-2.5">Região</th>
                <th className="px-3 py-2.5 text-left">Responsável</th>
                <th className="px-3 py-2.5 text-right">Vendas</th>
                <th className="px-3 py-2.5">Pix</th>
                <th className="px-3 py-2.5">Situação</th>
              </tr>
            </thead>
            <tbody>
              {nucleos.map((n) => (
                <tr key={n.id} className="border-b border-line/60 text-center last:border-0 even:bg-brand-bg/40">
                  <td className="px-3 py-3 text-left">
                    <p className="font-semibold text-ink">{n.nomeExibicao ?? n.nome}</p>
                    {n.udvId != null && <p className="font-mono text-xs text-ink-light">nº {n.udvId}</p>}
                  </td>
                  <td className="px-3 py-3 text-ink-muted">{n.regiao ?? '—'}</td>
                  <td className="px-3 py-3 text-left text-ink-muted">
                    {n.responsaveis.length
                      ? n.responsaveis.map((r) => r.email).join(', ')
                      : <span className="text-warning">nenhum</span>}
                  </td>
                  <td className="px-3 py-3 text-right text-ink-muted">{n.vendas}</td>
                  <td className="px-3 py-3">{n.temAsaas ? '✓' : '—'}</td>
                  <td className="px-3 py-3">
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <Switch checked={n.ativo} onCheckedChange={() => toggle(n)} aria-label="Ativo" />
                      <span className={cn('text-sm', n.ativo ? 'text-success' : 'text-danger')}>
                        {n.ativo ? 'Ativo' : 'Suspenso'}
                      </span>
                    </label>
                  </td>
                </tr>
              ))}
              {nucleos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-ink-light">
                    Nenhum empório ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        {/* Mobile */}
        <div className="mt-3 grid gap-2 md:hidden">
          {nucleos.map((n) => (
            <Card key={n.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{n.nomeExibicao ?? n.nome}</p>
                  <p className="mt-0.5 text-sm text-ink-light">
                    {n.regiao ?? '—'}
                    {n.udvId != null && ` · nº ${n.udvId}`} · {n.vendas} venda(s)
                  </p>
                </div>
                <label className="flex shrink-0 cursor-pointer items-center gap-2">
                  <Switch checked={n.ativo} onCheckedChange={() => toggle(n)} aria-label="Ativo" />
                  <span className={cn('text-sm font-medium', n.ativo ? 'text-success' : 'text-danger')}>
                    {n.ativo ? 'Ativo' : 'Suspenso'}
                  </span>
                </label>
              </div>
              <p className="mt-2 border-t border-line/60 pt-2 text-sm text-ink-muted">
                Responsável:{' '}
                {n.responsaveis.length ? n.responsaveis.map((r) => r.email).join(', ') : 'nenhum'}
                {n.temAsaas && ' · Pix ✓'}
              </p>
            </Card>
          ))}
          {nucleos.length === 0 && <Card className="p-6 text-center text-ink-light">Nenhum empório ainda.</Card>}
        </div>
      </main>

      {novo && (
        <OnboardModal
          regioes={regioes}
          onClose={() => setNovo(false)}
          onDone={async (aviso) => {
            setNovo(false)
            setMsg(aviso)
            await carregar()
          }}
        />
      )}
    </div>
  )
}

function OnboardModal({
  regioes,
  onClose,
  onDone,
}: {
  regioes: Regiao[]
  onClose: () => void
  onDone: (aviso: string) => void
}) {
  const [nome, setNome] = useState('')
  const [nomeExibicao, setNomeExibicao] = useState('')
  const [udvId, setUdvId] = useState('')
  const [regionId, setRegionId] = useState('')
  const [timezone, setTimezone] = useState('America/Sao_Paulo')
  const [responsavelEmail, setResponsavelEmail] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    try {
      const cnpjDigits = cnpj.replace(/\D/g, '')
      const r = await api<{ id: string; asaas: { ok: boolean; msg: string } }>('/gestor/nucleos', {
        method: 'POST',
        body: JSON.stringify({
          nome: nome.trim(),
          nomeExibicao: nomeExibicao.trim() || undefined,
          udvId: udvId.trim() ? Number(udvId) : undefined,
          regionId: regionId || undefined,
          timezone,
          responsavelEmail: responsavelEmail.trim(),
          cnpj: cnpjDigits.length === 14 ? cnpjDigits : undefined,
        }),
      })
      onDone(`Empório criado ✓ — link de senha enviado ao responsável. ASAAS: ${r.asaas.msg}`)
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao criar o empório.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-auto bg-black/40 p-4"
      onClick={onClose}
    >
      <Card className="my-6 w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-bg text-brand">
            <Building2 size={18} />
          </span>
          <h2 className="text-lg font-bold text-ink">Novo empório</h2>
        </div>

        <form onSubmit={salvar} className="flex flex-col gap-3">
          <Field label="Nome do núcleo (oficial)" htmlFor="nome">
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </Field>
          <Field label="Nome de exibição (opcional)" htmlFor="nomeex">
            <Input
              id="nomeex"
              value={nomeExibicao}
              onChange={(e) => setNomeExibicao(e.target.value)}
              placeholder="Ex.: Empório Senhora Santana"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nº REUNI (opcional)" htmlFor="udv">
              <Input id="udv" inputMode="numeric" value={udvId} onChange={(e) => setUdvId(e.target.value)} />
            </Field>
            <Field label="Região" htmlFor="regiao">
              <select
                id="regiao"
                value={regionId}
                onChange={(e) => setRegionId(e.target.value)}
                className="min-h-touch w-full rounded-lg border border-line bg-surface px-3 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
              >
                <option value="">—</option>
                {regioes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Fuso horário" htmlFor="tz">
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
          <Field label="E-mail do responsável" htmlFor="resp">
            <Input
              id="resp"
              type="email"
              value={responsavelEmail}
              onChange={(e) => setResponsavelEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="CNPJ (opcional — habilita Pix/ASAAS)" htmlFor="cnpj">
            <Input id="cnpj" inputMode="numeric" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
          </Field>

          {erro && <p className="text-sm font-semibold text-danger">{erro}</p>}
          <div className="mt-2 flex gap-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={salvando || !nome.trim() || !responsavelEmail.trim()}>
              {salvando ? 'Criando…' : 'Criar empório'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
