import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { fmtDataHora } from './datahora'

type Item = { clienteNome: string; valorCents: number }

const brl = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`
const compBR = (c: string) => `${c.slice(5, 7)}/${c.slice(0, 4)}`

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** Gera o PDF do corte (Cliente | Valor + TOTAL) para o tesoureiro lançar na tesouraria. */
export function exportarCortePdf(args: {
  nucleoNome?: string | null
  competencia: string
  periodoDe: string
  periodoAte: string
  executadoEm: string | null
  itens: Item[]
  totalCents: number
  qtdSocios: number
  timezone?: string
}) {
  const { nucleoNome, competencia, periodoDe, periodoAte, executadoEm, itens, totalCents, qtdSocios, timezone } = args
  const doc = new jsPDF()
  const m = 14
  let y = 18

  doc.setFontSize(15)
  doc.text(`Empório — ${nucleoNome ?? 'Núcleo UDV'}`, m, y)
  y += 8
  doc.setFontSize(12)
  doc.text(`Fechamento do crediário — competência ${compBR(competencia)}`, m, y)
  y += 7
  doc.setFontSize(10)
  doc.setTextColor(110)
  doc.text(`Janela: ${fmtDataHora(periodoDe, timezone)} → ${fmtDataHora(periodoAte, timezone)}`, m, y)
  y += 5
  doc.text(
    executadoEm
      ? `Fechado em ${fmtDataHora(executadoEm, timezone)} · ${qtdSocios} sócio(s)`
      : `Prévia (ainda não fechado) · ${qtdSocios} sócio(s)`,
    m,
    y,
  )
  y += 4
  doc.setTextColor(0)

  autoTable(doc, {
    startY: y + 2,
    head: [['Cliente', 'Valor']],
    body: itens.map((i) => [i.clienteNome, brl(i.valorCents)]),
    foot: [['TOTAL', brl(totalCents)]],
    styles: { fontSize: 10, cellPadding: 2 },
    headStyles: { fillColor: [17, 141, 255] },
    footStyles: { fillColor: [225, 240, 255], textColor: 0, fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: m, right: m },
  })

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y
  doc.setFontSize(8)
  doc.setTextColor(130)
  doc.text('Documento não fiscal — para lançamento na tesouraria.', m, finalY + 8)

  doc.save(`fechamento-socios_${slugify(nucleoNome ?? 'nucleo')}_${competencia}.pdf`)
}
