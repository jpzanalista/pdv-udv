import * as XLSX from 'xlsx'

type CorteItem = { clienteNome: string; valorCents: number }

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
    Cliente: i.clienteNome,
    'SUM de Valor': i.valorCents / 100,
  }))
  rows.push({ Cliente: 'TOTAL', 'SUM de Valor': totalCents / 100 })

  const ws = XLSX.utils.json_to_sheet(rows, { header: ['Cliente', 'SUM de Valor'] })
  ws['!cols'] = [{ wch: 48 }, { wch: 14 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sócios')

  XLSX.writeFile(wb, `corte-socios_${slugify(nucleoNome ?? 'nucleo')}_${competencia}.xlsx`)
}
