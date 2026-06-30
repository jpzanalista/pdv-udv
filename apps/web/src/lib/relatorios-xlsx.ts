import * as XLSX from 'xlsx'

const FORMA: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao_credito: 'Crédito',
  cartao_debito: 'Débito',
  conta: 'Na conta',
}
const reais = (cents: number) => cents / 100

type Resumo = {
  nucleoNome: string | null
  socios: number
  visitantes: number
  aReceberCents: number
  inadimplentes: number
}
type Vendas = {
  totalCents: number
  devolucoesCents: number
  liquidoCents: number
  qtdVendas: number
  ticketMedioCents: number
  porForma: { metodo: string; totalCents: number; qtd: number }[]
  porDia: { dia: string; totalCents: number; qtd: number }[]
  topProdutos: { descricao: string; qtde: number; totalCents: number }[]
}
type Financeiro = {
  aReceber: { socioCents: number; visitanteCents: number; institucionalCents: number; totalCents: number }
  inadimplencia: { qtd: number; valorCents: number }
  caixa: {
    sangriaTesourariaCents: number
    sangriaCompraCents: number
    suprimentoCents: number
    diferencaTotalCents: number
  }
  cobrancas: { pendentes: number; pendentesCents: number; confirmadas: number; confirmadasCents: number }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** Exporta os relatórios do período num .xlsx multi-abas. `fin` é opcional (depende do papel). */
export function exportarRelatoriosXlsx(args: {
  periodo: { de: string; ate: string }
  resumo: Resumo | null
  vendas: Vendas | null
  fin: Financeiro | null
}) {
  const { periodo, resumo, vendas, fin } = args
  const wb = XLSX.utils.book_new()
  const add = (nome: string, ws: XLSX.WorkSheet) => XLSX.utils.book_append_sheet(wb, ws, nome)

  // Resumo
  const resumoRows: (string | number)[][] = [
    ['Núcleo', resumo?.nucleoNome ?? ''],
    ['Período', `${periodo.de} a ${periodo.ate}`],
    [],
    ['Sócios', resumo?.socios ?? 0],
    ['Visitantes', resumo?.visitantes ?? 0],
    ['A receber (R$)', reais(resumo?.aReceberCents ?? 0)],
    ['Inadimplentes', resumo?.inadimplentes ?? 0],
  ]
  if (vendas) {
    resumoRows.push(
      [],
      ['Total vendido (R$)', reais(vendas.totalCents)],
      ['Devoluções (R$)', reais(vendas.devolucoesCents)],
      ['Líquido (R$)', reais(vendas.liquidoCents)],
      ['Nº de vendas', vendas.qtdVendas],
      ['Ticket médio (R$)', reais(vendas.ticketMedioCents)],
    )
  }
  const wsResumo = XLSX.utils.aoa_to_sheet(resumoRows)
  wsResumo['!cols'] = [{ wch: 22 }, { wch: 28 }]
  add('Resumo', wsResumo)

  if (vendas) {
    const wsDia = XLSX.utils.json_to_sheet(
      vendas.porDia.map((d) => ({ Dia: d.dia, 'Nº vendas': d.qtd, 'Total (R$)': reais(d.totalCents) })),
      { header: ['Dia', 'Nº vendas', 'Total (R$)'] },
    )
    wsDia['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 12 }]
    add('Vendas por dia', wsDia)

    const wsForma = XLSX.utils.json_to_sheet(
      vendas.porForma.map((f) => ({
        Forma: FORMA[f.metodo] ?? f.metodo,
        'Nº vendas': f.qtd,
        'Total (R$)': reais(f.totalCents),
      })),
      { header: ['Forma', 'Nº vendas', 'Total (R$)'] },
    )
    wsForma['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 12 }]
    add('Vendas por forma', wsForma)

    const wsProd = XLSX.utils.json_to_sheet(
      vendas.topProdutos.map((p) => ({
        Produto: p.descricao,
        Qtde: p.qtde,
        'Total (R$)': reais(p.totalCents),
      })),
      { header: ['Produto', 'Qtde', 'Total (R$)'] },
    )
    wsProd['!cols'] = [{ wch: 40 }, { wch: 8 }, { wch: 12 }]
    add('Top produtos', wsProd)
  }

  if (fin) {
    const finRows: (string | number)[][] = [
      ['A receber — Sócios (R$)', reais(fin.aReceber.socioCents)],
      ['A receber — Visitantes (R$)', reais(fin.aReceber.visitanteCents)],
      ['A receber — Institucional (R$)', reais(fin.aReceber.institucionalCents)],
      ['A receber — Total (R$)', reais(fin.aReceber.totalCents)],
      [],
      ['Inadimplentes (visitantes)', fin.inadimplencia.qtd],
      ['Inadimplência (R$)', reais(fin.inadimplencia.valorCents)],
      [],
      ['Sangrias p/ tesouraria (R$)', reais(fin.caixa.sangriaTesourariaCents)],
      ['Sangrias p/ compra (R$)', reais(fin.caixa.sangriaCompraCents)],
      ['Suprimentos (R$)', reais(fin.caixa.suprimentoCents)],
      ['Diferença de fechamentos (R$)', reais(fin.caixa.diferencaTotalCents)],
      [],
      ['Cobranças Pix pendentes', fin.cobrancas.pendentes],
      ['Cobranças Pix pendentes (R$)', reais(fin.cobrancas.pendentesCents)],
      ['Cobranças Pix confirmadas', fin.cobrancas.confirmadas],
      ['Cobranças Pix confirmadas (R$)', reais(fin.cobrancas.confirmadasCents)],
    ]
    const wsFin = XLSX.utils.aoa_to_sheet(finRows)
    wsFin['!cols'] = [{ wch: 32 }, { wch: 16 }]
    add('Financeiro', wsFin)
  }

  const nome = `relatorio_${slugify(resumo?.nucleoNome ?? 'nucleo')}_${periodo.de}_${periodo.ate}.xlsx`
  XLSX.writeFile(wb, nome)
}
