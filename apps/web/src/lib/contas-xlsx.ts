import type { ContaImportRow } from '@pdv-udv/shared'
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

const ALIASES = {
  nome: ['nome', 'cliente', 'razaosocial'],
  tipo: ['tipo'],
  cpf: ['cpf', 'cpfcnpj', 'documento', 'doc'],
  whatsapp: ['whatsapp', 'celular', 'telefone', 'fone', 'contato'],
  descontoPct: ['desconto', 'descontopct', 'desc'],
}

function num(v: unknown): number | undefined {
  if (v == null || v === '') return undefined
  if (typeof v === 'number') return v
  let s = String(v).trim()
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  const n = Number.parseFloat(s)
  return Number.isNaN(n) ? undefined : n
}

function tipoOf(v: unknown): ContaImportRow['tipo'] {
  const t = norm(v)
  if (t.startsWith('vis')) return 'visitante'
  if (t.startsWith('inst')) return 'institucional'
  if (t.startsWith('soc') || t.startsWith('fam')) return 'socio'
  return undefined
}

function str(v: unknown): string | undefined {
  return v != null && v !== '' ? String(v).trim() : undefined
}

export async function parseContasXlsx(file: File): Promise<ContaImportRow[]> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  // sheet_to_json mapeia pela 1ª linha (cabeçalho) e pula linhas totalmente em branco,
  // continuando nas linhas preenchidas abaixo delas.
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

  const rows: ContaImportRow[] = []
  for (const raw of json) {
    const obj: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(raw)) obj[norm(k)] = v
    const get = (aliases: string[]) => {
      for (const a of aliases) if (a in obj && obj[a] !== '') return obj[a]
      return undefined
    }
    const nome = get(ALIASES.nome)
    if (!nome) continue // pula linhas sem nome (vazias, subtotais)

    rows.push({
      nome: String(nome).trim(),
      tipo: tipoOf(get(ALIASES.tipo)),
      cpf: str(get(ALIASES.cpf)),
      whatsapp: str(get(ALIASES.whatsapp)),
      descontoPct: num(get(ALIASES.descontoPct)),
    })
  }
  return rows
}
