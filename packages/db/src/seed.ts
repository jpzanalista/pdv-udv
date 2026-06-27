import { readFileSync } from 'node:fs'
import { eq } from 'drizzle-orm'
import { createDb } from './client.js'
import { nucleos, pessoaNucleo, pessoas, regioes, usuarios } from './schema.js'

const url = process.env.DATABASE_URL ?? 'postgresql://pdv:pdv@localhost:5440/pdv'

type RegiaoJson = { id: number; name: string }
type NucleoJson = {
  id: number
  name: string
  type: number
  region_id: number
}

const TYPE_MAP: Record<number, 'sede' | 'nucleo' | 'dav'> = { 1: 'sede', 2: 'nucleo', 3: 'dav' }

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(new URL(`../data/${file}`, import.meta.url), 'utf8')) as T
}

function req<T>(v: T | undefined, msg: string): T {
  if (v === undefined) throw new Error(msg)
  return v
}

async function main() {
  const db = createDb(url)

  // 1) Regiões (idempotente por udv_id)
  const regioesData = readJson<RegiaoJson[]>('regioes.json')
  await db
    .insert(regioes)
    .values(regioesData.map((r) => ({ udvId: r.id, nome: r.name })))
    .onConflictDoNothing({ target: regioes.udvId })

  const regioesRows = await db.select().from(regioes)
  const regiaoByUdvId = new Map(regioesRows.map((r) => [r.udvId, r.id]))

  // 2) Núcleos (idempotente por udv_id)
  const nucleosData = readJson<NucleoJson[]>('nucleos.json')
  await db
    .insert(nucleos)
    .values(
      nucleosData.map((n) => ({
        udvId: n.id,
        nome: n.name,
        type: TYPE_MAP[n.type] ?? 'nucleo',
        regionId: regiaoByUdvId.get(n.region_id) ?? null,
      })),
    )
    .onConflictDoNothing({ target: nucleos.udvId })

  const totalReg = (await db.select().from(regioes)).length
  const totalNuc = (await db.select().from(nucleos)).length

  // 3) Dev users (admin global + operador no Núcleo N. Senhora Santana / Empório NSS)
  const nucleoDev = req(
    (await db.select().from(nucleos).where(eq(nucleos.udvId, 162)).limit(1))[0],
    'núcleo udv_id 162 (Senhora Santana) não encontrado',
  )

  await db
    .insert(pessoas)
    .values([
      { cpf: '00000000000', nome: 'Admin', email: 'admin@pdv.local' },
      { cpf: '11111111111', nome: 'Operador', email: 'caixa@pdv.local' },
    ])
    .onConflictDoNothing({ target: pessoas.cpf })

  const admin = req(
    (await db.select().from(pessoas).where(eq(pessoas.email, 'admin@pdv.local')).limit(1))[0],
    'pessoa admin não criada',
  )
  const operador = req(
    (await db.select().from(pessoas).where(eq(pessoas.email, 'caixa@pdv.local')).limit(1))[0],
    'pessoa operador não criada',
  )

  const ensureUsuario = async (
    pessoaId: string,
    role: 'admin' | 'responsavel_emporio',
    nucleoId: string | null,
  ) => {
    const exists = (
      await db.select().from(usuarios).where(eq(usuarios.pessoaId, pessoaId)).limit(1)
    )[0]
    if (!exists) await db.insert(usuarios).values({ pessoaId, role, nucleoId })
  }
  await ensureUsuario(admin.id, 'admin', null)
  await ensureUsuario(operador.id, 'responsavel_emporio', nucleoDev.id)
  await db
    .insert(pessoaNucleo)
    .values({ pessoaId: operador.id, nucleoId: nucleoDev.id })
    .onConflictDoNothing()

  console.log(`Seed OK: ${totalReg} regiões, ${totalNuc} núcleos`)
  console.log(`  dev núcleo (operador): ${nucleoDev.nome} (${nucleoDev.id})`)
  console.log('  dev-login: admin@pdv.local (admin) / caixa@pdv.local (responsavel_emporio)')
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
