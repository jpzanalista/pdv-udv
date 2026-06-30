import * as XLSX from 'xlsx'

type CorteItem = { codigo: number | null; clienteNome: string; valorCents: number }

const cod = (c: number | null) => (c != null ? String(c).padStart(3, '0') : '')

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** Gera a planilha do corte no formato da tesouraria: Cliente | SUM de Valor (+ TOTAL). */
export function exportarCorteXlsx(
  competencia: string,
  itens: CorteItem[],
  totalCents: number,
  nucleoNome?: string,
) {
  const rows: Record<string, string | number>[] = itens.map((i) => ({
    Código: cod(i.codigo),
    Cliente: i.clienteNome,
    'SUM de Valor': i.valorCents / 100,
  }))
  rows.push({ Código: '', Cliente: 'TOTAL', 'SUM de Valor': totalCents / 100 })

  const ws = XLSX.utils.json_to_sheet(rows, { header: ['Código', 'Cliente', 'SUM de Valor'] })
  ws['!cols'] = [{ wch: 8 }, { wch: 48 }, { wch: 14 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sócios')

  XLSX.writeFile(wb, `fechamento-socios_${slugify(nucleoNome ?? 'nucleo')}_${competencia}.xlsx`)
}
