import type { ProdutoImportRow } from '@pdv-udv/shared'
import * as XLSX from 'xlsx'

// Normaliza cabeçalho: minúsculo, sem espaços/underscore/acentos.
function norm(s: unknown): string {
  return String(s)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\s]+/g, '')
}

const ALIASES: Record<keyof ProdutoImportRow, string[]> = {
  codigo: ['codigo'],
  codigoBarras: ['codigobarras', 'codigodebarras', 'codbarras'],
  descricao: ['descricao', 'produto', 'nome'],
  grupo: ['grupo', 'categoria'],
  precoVenda: ['precovenda', 'venda', 'preco'],
  precoCusto: ['precocusto', 'custo'],
  estoqueAtual: ['estoqueatual', 'estoque'],
  controlaEstoque: ['controlaestoque'],
  ativo: ['ativo'],
  exibirVenda: ['exibirtela', 'exibirvenda', 'exibir', 'exibirnatela'],
}

function num(v: unknown): number | undefined {
  if (v == null || v === '') return undefined
  if (typeof v === 'number') return v
  let s = String(v).trim()
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  const n = Number.parseFloat(s)
  return Number.isNaN(n) ? undefined : n
}

function boolSN(v: unknown): boolean | undefined {
  if (v == null || v === '') return undefined
  return ['s', 'sim', 'true', '1', 'x'].includes(String(v).trim().toLowerCase())
}

export async function parseProdutosXlsx(file: File): Promise<ProdutoImportRow[]> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

  const rows: ProdutoImportRow[] = []
  for (const raw of json) {
    const obj: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(raw)) obj[norm(k)] = v
    const get = (aliases: string[]) => {
      for (const a of aliases) if (a in obj && obj[a] !== '') return obj[a]
      return undefined
    }
    const descricaoRaw = get(ALIASES.descricao)
    if (!descricaoRaw) continue // pula linhas sem descrição (subtotais, vazias)

    const codigo = get(ALIASES.codigo)
    const codigoBarras = get(ALIASES.codigoBarras)
    const grupo = get(ALIASES.grupo)
    rows.push({
      codigo: codigo != null && codigo !== '' ? String(codigo).trim() : undefined,
      codigoBarras: codigoBarras != null && codigoBarras !== '' ? String(codigoBarras).trim() : undefined,
      descricao: String(descricaoRaw).trim(),
      grupo: grupo != null && grupo !== '' ? String(grupo).trim() : undefined,
      precoVenda: num(get(ALIASES.precoVenda)) ?? 0,
      precoCusto: num(get(ALIASES.precoCusto)),
      estoqueAtual: num(get(ALIASES.estoqueAtual)),
      controlaEstoque: boolSN(get(ALIASES.controlaEstoque)),
      ativo: boolSN(get(ALIASES.ativo)),
      exibirVenda: boolSN(get(ALIASES.exibirVenda)),
    })
  }
  return rows
}
