import { readFileSync } from 'node:fs'
import { eq } from 'drizzle-orm'
import { createDb } from './client.js'
import { categorias, contas, nucleos, produtos } from './schema.js'

const url = process.env.DATABASE_URL ?? 'postgresql://pdv:pdv@localhost:5440/pdv'
const NUCLEO_UDV_ID = 162 // Núcleo Nossa Senhora Santana (13ª Região) — Empório NSS

type ProdutoJson = {
  codigo: string
  codigoBarras: string | null
  descricao: string
  grupo: string
  precoCusto: number
  precoVenda: number
  controlaEstoque: boolean
  estoqueAtual: number
  ativo: boolean
  exibirVenda: boolean
}
type ClienteJson = { nome: string; cidade: string }

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(readFileSync(new URL(`../data/taurus/${file}`, import.meta.url), 'utf8')) as T
  } catch {
    return null
  }
}

function req<T>(v: T | undefined, msg: string): T {
  if (v === undefined) throw new Error(msg)
  return v
}

async function main() {
  const db = createDb(url)

  const nucleo = req(
    (await db.select().from(nucleos).where(eq(nucleos.udvId, NUCLEO_UDV_ID)).limit(1))[0],
    `núcleo udv_id ${NUCLEO_UDV_ID} não encontrado (rode db:seed antes)`,
  )

  // Idempotência: se já importou, não duplica.
  const existentes = await db.select().from(produtos).where(eq(produtos.nucleoId, nucleo.id)).limit(1)
  if (existentes.length > 0) {
    console.log(`Já existem produtos no núcleo ${nucleo.nome} — import pulado (evita duplicar).`)
    process.exit(0)
  }

  const produtosData = req(readJson<ProdutoJson[]>('produtos.json') ?? undefined, 'produtos.json ausente')

  // Categorias a partir dos grupos
  const grupos = [...new Set(produtosData.map((p) => p.grupo))].sort()
  const catRows = await db
    .insert(categorias)
    .values(grupos.map((nome, i) => ({ nucleoId: nucleo.id, nome, ordem: i })))
    .returning()
  const catByNome = new Map(catRows.map((c) => [c.nome, c.id]))

  // Produtos
  await db.insert(produtos).values(
    produtosData.map((p) => ({
      nucleoId: nucleo.id,
      categoriaId: catByNome.get(p.grupo) ?? null,
      codigo: p.codigo || null,
      codigoBarras: p.codigoBarras,
      descricao: p.descricao,
      precoVenda: String(p.precoVenda),
      precoCusto: String(p.precoCusto),
      controlaEstoque: p.controlaEstoque,
      estoqueAtual: String(p.estoqueAtual),
      ativo: p.ativo,
      exibirVenda: p.exibirVenda,
    })),
  )

  // Clientes → contas familiares (só nome; CPF/titular enriquecidos depois).
  // clientes.json é gitignored (PII) — se ausente, pula.
  const clientesData = readJson<ClienteJson[]>('clientes.json')
  let contasCriadas = 0
  if (clientesData?.length) {
    await db.insert(contas).values(
      clientesData.map((c) => ({
        nucleoId: nucleo.id,
        tipo: 'socio' as const,
        nome: c.nome,
      })),
    )
    contasCriadas = clientesData.length
  }

  console.log(`Import TaurusPOS OK no núcleo ${nucleo.nome}:`)
  console.log(`  categorias: ${catRows.length} (${grupos.join(', ')})`)
  console.log(`  produtos:   ${produtosData.length}`)
  console.log(
    `  contas:     ${contasCriadas}${clientesData ? '' : ' (clientes.json ausente — PII gitignored — pulado)'}`,
  )
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
