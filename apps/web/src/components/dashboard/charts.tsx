'use client'

import { formatBRL } from '@pdv-udv/core'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

// Cores via tokens (claro/escuro automático).
const AXIS = 'rgb(var(--ink-light))'
const GRID = 'rgb(var(--line))'
const tooltipStyle = {
  backgroundColor: 'rgb(var(--surface))',
  border: '1px solid rgb(var(--line))',
  borderRadius: 8,
  color: 'rgb(var(--ink))',
  fontSize: 13,
}
const labelStyle = { color: 'rgb(var(--ink-muted))' }
const reaisK = (v: number) => `R$ ${Math.round(v / 100).toLocaleString('pt-BR')}`

/** Área de faturamento por dia. data: { label, valor(cents) }[] */
export function FaturamentoArea({ data }: { data: { label: string; valor: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="gradFat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--brand))" stopOpacity={0.35} />
            <stop offset="100%" stopColor="rgb(var(--brand))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis
          tick={{ fill: AXIS, fontSize: 12 }}
          tickFormatter={reaisK}
          tickLine={false}
          axisLine={false}
          width={64}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={labelStyle}
          formatter={(v) => [formatBRL(v as number), 'Faturamento']}
        />
        <Area type="monotone" dataKey="valor" stroke="rgb(var(--brand))" strokeWidth={2} fill="url(#gradFat)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/** Rosca com legenda lateral. data: { label, valor(cents), cor }[] */
export function Donut({ data }: { data: { label: string; valor: number; cor: string }[] }) {
  const total = data.reduce((s, d) => s + d.valor, 0)
  return (
    <div className="flex items-center gap-3">
      <ResponsiveContainer width="48%" height={190}>
        <PieChart>
          <Pie data={data} dataKey="valor" nameKey="label" innerRadius={48} outerRadius={78} paddingAngle={2}>
            {data.map((d) => (
              <Cell key={d.label} fill={d.cor} stroke="rgb(var(--surface))" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatBRL(v as number)} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="flex-1 space-y-1.5 text-sm">
        {data.map((d) => (
          <li key={d.label} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-ink-muted">
              <span className="h-3 w-3 rounded-full" style={{ background: d.cor }} />
              {d.label}
            </span>
            <span className="font-semibold text-ink">
              {formatBRL(d.valor)} · {total ? Math.round((d.valor / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Barras horizontais (ranking). moeda=true → R$; false → número. */
export function BarTop({
  data,
  moeda = true,
}: {
  data: { label: string; valor: number }[]
  moeda?: boolean
}) {
  const inteiro = (v: number) => v.toLocaleString('pt-BR')
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis
          type="number"
          tickFormatter={moeda ? reaisK : inteiro}
          tick={{ fill: AXIS, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={190}
          tick={{ fill: AXIS, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [moeda ? formatBRL(v as number) : inteiro(v as number), moeda ? 'Faturamento' : 'Qtde']}
          cursor={{ fill: 'rgb(var(--brand-bg))' }}
        />
        <Bar dataKey="valor" fill="rgb(var(--brand))" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Barras verticais por mês. data: { label, valor(cents) }[] */
export function BarMes({ data }: { data: { label: string; valor: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
        <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tickFormatter={reaisK} tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={false} width={64} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [formatBRL(v as number), 'Faturamento']}
          cursor={{ fill: 'rgb(var(--brand-bg))' }}
        />
        <Bar dataKey="valor" fill="rgb(var(--brand))" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
