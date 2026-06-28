'use client'

import { formatBRL } from '@pdv-udv/core'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { ApiError, api } from '@/lib/api'
import { clearTokens, getToken } from '@/lib/auth'

const VENDAS_ROLES = ['responsavel_emporio', 'presidencia', 'representante_nucleo', 'admin']
const FIN_ROLES = [...VENDAS_ROLES, 'tesoureiro_1', 'tesoureiro_2']
const TESOUREIRO = ['tesoureiro_1', 'tesoureiro_2', 'admin']
const GESTAO = ['presidencia', 'representante_nucleo', 'admin']

const FORMA: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao_credito: 'Crédito',
  cartao_debito: 'Débito',
  conta: 'Na conta',
}
const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`

type ResumoRel = {
  nucleoNome: string | null
  socios: number
  visitantes: number
  aReceberCents: number
  inadimplentes: number
}
type VendasRel = {
  totalCents: number
  qtdVendas: number
  ticketMedioCents: number
  porForma: { metodo: string; totalCents: number; qtd: number }[]
  porDia: { dia: string; totalCents: number; qtd: number }[]
}
type FinRel = {
  aReceber: { socioCents: number; visitanteCents: number; institucionalCents: number; totalCents: number }
  inadimplencia: { qtd: number; valorCents: number }
  caixa: {
    sangriaTesourariaCents: number
    sangriaCompraCents: number
    suprimentoCents: number
    fechamentos: { dia: string; diferencaCents: number }[]
    diferencaTotalCents: number
  }
  cobrancas: { pendentes: number; pendentesCents: number; confirmadas: number; confirmadasCents: number }
}

export default function RelatoriosPage() {
  const router = useRouter()
  const hoje = new Date().toLocaleDateString('en-CA')
  const [role, setRole] = useState<string | null>(null)
  const [resumo, setResumo] = useState<ResumoRel | null>(null)
  const [de, setDe] = useState(`${hoje.slice(0, 7)}-01`)
  const [ate, setAte] = useState(hoje)
  const [vendas, setVendas] = useState<VendasRel | null>(null)
  const [fin, setFin] = useState<FinRel | null>(null)
  const [carregando, setCarregando] = useState(false)

  const carregar = useCallback(
    async (papel: string) => {
      setCarregando(true)
      const q = `?de=${de}&ate=${ate}`
      try {
        if (VENDAS_ROLES.includes(papel)) setVendas(await api<VendasRel>(`/relatorios/vendas${q}`))
        if (FIN_ROLES.includes(papel)) setFin(await api<FinRel>(`/relatorios/financeiro${q}`))
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) router.replace('/login')
      } finally {
        setCarregando(false)
      }
    },
    [de, ate, router],
  )

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    api<{ role: string }>('/auth/me')
      .then((m) => {
        setRole(m.role)
        api<ResumoRel>('/relatorios/resumo').then(setResumo).catch(() => {})
        return carregar(m.role)
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) router.replace('/login')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  if (!role) return <main className="p-8 text-ink-muted">Carregando…</main>

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand">Relatórios</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/historico" className="text-ink-muted">
            Histórico
          </Link>
          {GESTAO.includes(role) && (
            <Link href="/responsaveis" className="text-ink-muted">
              Responsáveis
            </Link>
          )}
          {TESOUREIRO.includes(role) && (
            <Link href="/tesouraria" className="text-ink-muted">
              Tesouraria
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              clearTokens()
              router.replace('/login')
            }}
            className="text-ink-light"
          >
            Sair
          </button>
        </div>
      </div>

      {resumo && (
        <div className="mt-3">
          {resumo.nucleoNome && (
            <p className="mb-2 font-semibold text-ink">{resumo.nucleoNome}</p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="Sócios" valor={String(resumo.socios)} />
            <Kpi label="Visitantes" valor={String(resumo.visitantes)} />
            <Kpi label="A receber" valor={formatBRL(resumo.aReceberCents)} />
            <Kpi label="Inadimplentes" valor={String(resumo.inadimplentes)} />
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="block text-ink-light">De</span>
          <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="w-auto" />
        </label>
        <label className="text-sm">
          <span className="block text-ink-light">Até</span>
          <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="w-auto" />
        </label>
        <Button className="text-sm" onClick={() => carregar(role)} disabled={carregando}>
          {carregando ? 'Atualizando…' : 'Atualizar'}
        </Button>
      </div>

      {vendas && (
        <Secao titulo="Vendas">
          <div className="grid grid-cols-3 gap-3">
            <Kpi label="Total vendido" valor={formatBRL(vendas.totalCents)} />
            <Kpi label="Nº de vendas" valor={String(vendas.qtdVendas)} />
            <Kpi label="Ticket médio" valor={formatBRL(vendas.ticketMedioCents)} />
          </div>
          <Bloco titulo="Por forma de pagamento">
            {vendas.porForma.length === 0 ? (
              <Vazio />
            ) : (
              vendas.porForma.map((f) => (
                <Barra
                  key={f.metodo}
                  label={`${FORMA[f.metodo] ?? f.metodo} (${f.qtd})`}
                  value={f.totalCents}
                  max={vendas.totalCents}
                />
              ))
            )}
          </Bloco>
          <Bloco titulo="Por dia">
            {vendas.porDia.length === 0 ? (
              <Vazio />
            ) : (
              vendas.porDia.map((d) => (
                <Barra
                  key={d.dia}
                  label={`${ddmm(d.dia)} (${d.qtd})`}
                  value={d.totalCents}
                  max={Math.max(...vendas.porDia.map((x) => x.totalCents))}
                />
              ))
            )}
          </Bloco>
        </Secao>
      )}

      {fin && (
        <Secao titulo="Financeiro">
          <div className="grid grid-cols-3 gap-3">
            <Kpi label="A receber (total)" valor={formatBRL(fin.aReceber.totalCents)} />
            <Kpi label="Sócios" valor={formatBRL(fin.aReceber.socioCents)} />
            <Kpi label="Visitantes" valor={formatBRL(fin.aReceber.visitanteCents)} />
          </div>
          <Bloco titulo="Inadimplência (visitantes)">
            <Linha label={`${fin.inadimplencia.qtd} visitante(s)`} valor={formatBRL(fin.inadimplencia.valorCents)} />
          </Bloco>
          <Bloco titulo="Caixa no período">
            <Linha label="Sangrias p/ tesouraria" valor={formatBRL(fin.caixa.sangriaTesourariaCents)} />
            <Linha label="Sangrias p/ compra" valor={formatBRL(fin.caixa.sangriaCompraCents)} />
            <Linha label="Suprimentos" valor={formatBRL(fin.caixa.suprimentoCents)} />
            <Linha
              label={`Fechamentos (${fin.caixa.fechamentos.length}) — diferença`}
              valor={formatBRL(fin.caixa.diferencaTotalCents)}
            />
          </Bloco>
          <Bloco titulo="Cobranças Pix (ASAAS)">
            <Linha
              label={`Pendentes (${fin.cobrancas.pendentes})`}
              valor={formatBRL(fin.cobrancas.pendentesCents)}
            />
            <Linha
              label={`Confirmadas (${fin.cobrancas.confirmadas})`}
              valor={formatBRL(fin.cobrancas.confirmadasCents)}
            />
          </Bloco>
        </Secao>
      )}
    </main>
  )
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-light">{titulo}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}
function Kpi({ label, valor }: { label: string; valor: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-ink-light">{label}</p>
      <p className="text-xl font-bold text-ink">{valor}</p>
    </Card>
  )
}
function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <Card className="p-4">
      <p className="mb-2 font-semibold text-ink">{titulo}</p>
      {children}
    </Card>
  )
}
function Barra({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="py-1">
      <div className="flex justify-between text-sm">
        <span className="text-ink-muted">{label}</span>
        <span className="font-semibold">{formatBRL(value)}</span>
      </div>
      <div className="mt-1 h-2 rounded bg-canvas">
        <div className="h-2 rounded bg-brand" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between border-b border-line py-1 text-sm last:border-0">
      <span className="text-ink-muted">{label}</span>
      <span className="font-semibold">{valor}</span>
    </div>
  )
}
function Vazio() {
  return <p className="text-sm text-ink-light">Sem dados no período.</p>
}
