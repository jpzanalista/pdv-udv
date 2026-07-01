'use client'

import { formatBRL } from '@pdv-udv/core'
import { useRouter } from 'next/navigation'
import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { BarMes, BarTop, Donut, FaturamentoArea } from '@/components/dashboard/charts'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { ApiError, api } from '@/lib/api'
import { getToken } from '@/lib/auth'
import { exportarRelatoriosXlsx } from '@/lib/relatorios-xlsx'
import { cn } from '@/lib/utils'

const VENDAS_ROLES = ['responsavel_emporio', 'presidencia', 'representante_nucleo', 'admin']
const FIN_ROLES = [...VENDAS_ROLES, 'tesoureiro_1', 'tesoureiro_2']
const GESTAO = ['responsavel_emporio', 'presidencia', 'representante_nucleo', 'admin']

const FORMA: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao_credito: 'Crédito',
  cartao_debito: 'Débito',
  conta: 'Na conta',
}
const COR_FORMA: Record<string, string> = {
  conta: 'rgb(var(--brand))',
  pix: '#22c55e',
  dinheiro: '#f59e0b',
  cartao_credito: '#8b5cf6',
  cartao_debito: '#06b6d4',
}
const TIPO: Record<string, string> = {
  socio: 'Sócio',
  visitante: 'Visitante',
  institucional: 'Institucional',
  avulso: 'Avulso',
}
const COR_TIPO: Record<string, string> = {
  socio: 'rgb(var(--brand))',
  visitante: '#f59e0b',
  institucional: '#64748b',
  avulso: '#22c55e',
}
const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const mesLabel = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}`
// paleta p/ categorias (ciclo)
const PALETA = ['rgb(var(--brand))', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#64748b', '#eab308']

type ResumoRel = {
  nucleoNome: string | null
  socios: number
  visitantes: number
  aReceberCents: number
  inadimplentes: number
}
type VendasRel = {
  totalCents: number
  devolucoesCents: number
  liquidoCents: number
  custoCents: number
  margemCents: number
  qtdVendas: number
  ticketMedioCents: number
  porForma: { metodo: string; totalCents: number; qtd: number }[]
  porTipoCliente: { tipo: string; totalCents: number; qtd: number }[]
  porDia: { dia: string; totalCents: number; qtd: number }[]
  porMes: { mes: string; totalCents: number; qtd: number }[]
  porCategoria: { categoria: string; totalCents: number; qtde: number }[]
  topProdutos: { descricao: string; qtde: number; totalCents: number }[]
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

const TABS = [
  { id: 'operacao', label: 'Operação', roles: VENDAS_ROLES },
  { id: 'produtos', label: 'Produtos', roles: VENDAS_ROLES },
  { id: 'crediario', label: 'Crediário', roles: FIN_ROLES },
  { id: 'diretoria', label: 'Diretoria', roles: GESTAO },
] as const

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
  const [tab, setTab] = useState<string>('operacao')

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
        const disponiveis = TABS.filter((t) => t.roles.includes(m.role))
        if (disponiveis.length && !disponiveis.some((t) => t.id === 'operacao')) setTab(disponiveis[0].id)
        api<ResumoRel>('/relatorios/resumo').then(setResumo).catch(() => {})
        return carregar(m.role)
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) router.replace('/login')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  if (!role) return <main className="grid min-h-[100dvh] place-items-center text-ink-muted">Carregando…</main>

  const abas = TABS.filter((t) => t.roles.includes(role))
  const margemPct = vendas && vendas.liquidoCents > 0 ? Math.round((vendas.margemCents / vendas.liquidoCents) * 100) : 0

  return (
    <AppShell title="Relatórios" fluid>
      {/* Período + ações */}
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="block text-ink-light">De</span>
          <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="w-auto" />
        </label>
        <label className="text-sm">
          <span className="block text-ink-light">Até</span>
          <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="w-auto" />
        </label>
        <Button
          variant="ghost"
          className="text-xs"
          onClick={() => {
            setDe('2026-01-01')
            setAte('2026-06-30')
          }}
        >
          1º sem. 2026
        </Button>
        <Button
          variant="ghost"
          className="text-xs"
          onClick={() => {
            setDe('2026-01-01')
            setAte('2026-12-31')
          }}
        >
          Ano 2026
        </Button>
        <Button onClick={() => carregar(role)} disabled={carregando}>
          {carregando ? 'Atualizando…' : 'Atualizar'}
        </Button>
        <Button
          variant="secondary"
          onClick={() => exportarRelatoriosXlsx({ periodo: { de, ate }, resumo, vendas, fin })}
          disabled={!vendas}
        >
          Exportar Excel
        </Button>
      </div>

      {/* Abas */}
      <div className="mt-4 flex flex-wrap gap-1 border-b border-line">
        {abas.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors',
              tab === t.id
                ? 'border-brand text-brand'
                : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* OPERAÇÃO */}
      {tab === 'operacao' && vendas && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="Faturamento" valor={formatBRL(vendas.totalCents)} destaque />
            <Kpi label="Nº de vendas" valor={String(vendas.qtdVendas)} />
            <Kpi label="Ticket médio" valor={formatBRL(vendas.ticketMedioCents)} />
            <Kpi label="Margem (est.)" valor={`${formatBRL(vendas.margemCents)} · ${margemPct}%`} />
          </div>

          <Bloco titulo="Faturamento por dia">
            {vendas.porDia.length === 0 ? (
              <Vazio />
            ) : (
              <FaturamentoArea data={vendas.porDia.map((d) => ({ label: ddmm(d.dia), valor: d.totalCents }))} />
            )}
          </Bloco>

          <div className="grid gap-4 lg:grid-cols-2">
            <Bloco titulo="Forma de pagamento">
              {vendas.porForma.length === 0 ? (
                <Vazio />
              ) : (
                <Donut
                  data={vendas.porForma.map((f) => ({
                    label: FORMA[f.metodo] ?? f.metodo,
                    valor: f.totalCents,
                    cor: COR_FORMA[f.metodo] ?? '#94a3b8',
                  }))}
                />
              )}
            </Bloco>
            <Bloco titulo="Identificado × avulso">
              {vendas.porTipoCliente.length === 0 ? (
                <Vazio />
              ) : (
                <Donut
                  data={vendas.porTipoCliente.map((t) => ({
                    label: TIPO[t.tipo] ?? t.tipo,
                    valor: t.totalCents,
                    cor: COR_TIPO[t.tipo] ?? '#94a3b8',
                  }))}
                />
              )}
            </Bloco>
          </div>
        </div>
      )}

      {/* PRODUTOS */}
      {tab === 'produtos' && vendas && (
        <div className="mt-4 space-y-4">
          {(() => {
            const abc = classificaAbc(vendas.topProdutos)
            return (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Kpi label="Produtos vendidos" valor={String(vendas.topProdutos.length)} />
                <Kpi
                  label="Curva A (≈80%)"
                  valor={`${abc.a} produto(s)`}
                />
                <Kpi label="Custo (est.)" valor={formatBRL(vendas.custoCents)} />
                <Kpi label="Margem (est.)" valor={`${formatBRL(vendas.margemCents)} · ${margemPct}%`} />
              </div>
            )
          })()}
          <div className="grid gap-4 lg:grid-cols-2">
            <Bloco titulo="Top produtos por faturamento">
              {vendas.topProdutos.length === 0 ? (
                <Vazio />
              ) : (
                <BarTop
                  data={vendas.topProdutos.slice(0, 12).map((p) => ({ label: p.descricao, valor: p.totalCents }))}
                />
              )}
            </Bloco>
            <Bloco titulo="Top produtos por quantidade">
              {vendas.topProdutos.length === 0 ? (
                <Vazio />
              ) : (
                <BarTop
                  moeda={false}
                  data={[...vendas.topProdutos]
                    .sort((a, b) => b.qtde - a.qtde)
                    .slice(0, 12)
                    .map((p) => ({ label: p.descricao, valor: Math.round(p.qtde) }))}
                />
              )}
            </Bloco>
          </div>
          <Bloco titulo="Por categoria">
            {vendas.porCategoria.length === 0 ? (
              <Vazio />
            ) : (
              <Donut
                data={vendas.porCategoria.map((c, i) => ({
                  label: c.categoria,
                  valor: c.totalCents,
                  cor: PALETA[i % PALETA.length],
                }))}
              />
            )}
          </Bloco>
        </div>
      )}

      {/* CREDIÁRIO */}
      {tab === 'crediario' && fin && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="A receber (total)" valor={formatBRL(fin.aReceber.totalCents)} destaque />
            <Kpi label="Sócios" valor={formatBRL(fin.aReceber.socioCents)} />
            <Kpi label="Visitantes" valor={formatBRL(fin.aReceber.visitanteCents)} />
            <Kpi label="Inadimplência" valor={formatBRL(fin.inadimplencia.valorCents)} />
          </div>
          {fin.aReceber.totalCents > 0 && (
            <Bloco titulo="A receber por tipo">
              <Donut
                data={[
                  { label: 'Sócio', valor: fin.aReceber.socioCents, cor: COR_TIPO.socio },
                  { label: 'Visitante', valor: fin.aReceber.visitanteCents, cor: COR_TIPO.visitante },
                  { label: 'Institucional', valor: fin.aReceber.institucionalCents, cor: COR_TIPO.institucional },
                ].filter((d) => d.valor > 0)}
              />
            </Bloco>
          )}
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
        </div>
      )}

      {/* DIRETORIA */}
      {tab === 'diretoria' && (
        <div className="mt-4 space-y-4">
          {resumo && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi label="Contas de sócio (ativas)" valor={String(resumo.socios)} />
              <Kpi label="Contas de visitante (ativas)" valor={String(resumo.visitantes)} />
              <Kpi label="A receber" valor={formatBRL(resumo.aReceberCents)} />
              <Kpi label="Inadimplentes" valor={String(resumo.inadimplentes)} />
            </div>
          )}
          {vendas && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Kpi label="Faturamento" valor={formatBRL(vendas.totalCents)} destaque />
                <Kpi label="Líquido" valor={formatBRL(vendas.liquidoCents)} />
                <Kpi label="Margem (est.)" valor={`${formatBRL(vendas.margemCents)} · ${margemPct}%`} />
                <Kpi label="Nº de vendas" valor={String(vendas.qtdVendas)} />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <Bloco titulo="Faturamento por mês">
                  {vendas.porMes.length === 0 ? (
                    <Vazio />
                  ) : (
                    <BarMes data={vendas.porMes.map((m) => ({ label: mesLabel(m.mes), valor: m.totalCents }))} />
                  )}
                </Bloco>
                <Bloco titulo="Identificado × avulso">
                  {vendas.porTipoCliente.length === 0 ? (
                    <Vazio />
                  ) : (
                    <Donut
                      data={vendas.porTipoCliente.map((t) => ({
                        label: TIPO[t.tipo] ?? t.tipo,
                        valor: t.totalCents,
                        cor: COR_TIPO[t.tipo] ?? '#94a3b8',
                      }))}
                    />
                  )}
                </Bloco>
              </div>
            </>
          )}
        </div>
      )}
    </AppShell>
  )
}

/** Curva ABC por faturamento: A ≈ 80%, B ≈ 15%, C ≈ 5% do total. */
function classificaAbc(produtos: { totalCents: number }[]): { a: number; b: number; c: number } {
  const total = produtos.reduce((s, p) => s + p.totalCents, 0)
  if (!total) return { a: 0, b: 0, c: 0 }
  const ord = [...produtos].sort((x, y) => y.totalCents - x.totalCents)
  let acc = 0
  const r = { a: 0, b: 0, c: 0 }
  for (const p of ord) {
    acc += p.totalCents
    const pct = acc / total
    if (pct <= 0.8) r.a++
    else if (pct <= 0.95) r.b++
    else r.c++
  }
  return r
}

function Kpi({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <Card className={cn('p-4', destaque && 'bg-brand text-white')}>
      <p className={cn('text-xs', destaque ? 'text-white/80' : 'text-ink-light')}>{label}</p>
      <p className={cn('text-xl font-bold', destaque ? 'text-white' : 'text-ink')}>{valor}</p>
    </Card>
  )
}
function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <Card className="p-4">
      <p className="mb-3 font-semibold text-ink">{titulo}</p>
      {children}
    </Card>
  )
}
function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between border-b border-line py-1.5 text-sm last:border-0">
      <span className="text-ink-muted">{label}</span>
      <span className="font-semibold text-ink">{valor}</span>
    </div>
  )
}
function Vazio() {
  return <p className="text-sm text-ink-light">Sem dados no período.</p>
}
