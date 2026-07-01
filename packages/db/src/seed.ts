import { readFileSync } from 'node:fs'
import { eq } from 'drizzle-orm'
import { createAdminDb } from './client.js'
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
  const db = createAdminDb(url)

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
      { cpf: '22222222222', nome: 'Tesoureiro', email: 'tesoureiro@pdv.local' },
      // Diretoria do Senhora Santana (e-mails de cargo reais) — dev-login p/ demo.
      { cpf: '33333333333', nome: 'Presidência NSS', email: 'pres.senhorasantana@udv.org.br' },
      { cpf: '44444444444', nome: 'Representante NSS', email: 'repres.senhorasantana@udv.org.br' },
      { cpf: '55555555555', nome: 'Tesouraria NSS', email: 'tes.senhorasantana@udv.org.br' },
    ])
    .onConflictDoNothing({ target: pessoas.cpf })

  const byEmail = async (email: string) =>
    req(
      (await db.select().from(pessoas).where(eq(pessoas.email, email)).limit(1))[0],
      `pessoa ${email} não criada`,
    )
  const admin = await byEmail('admin@pdv.local')
  const operador = await byEmail('caixa@pdv.local')
  const tesoureiro = await byEmail('tesoureiro@pdv.local')
  const presidente = await byEmail('pres.senhorasantana@udv.org.br')
  const representante = await byEmail('repres.senhorasantana@udv.org.br')
  const tesouraria = await byEmail('tes.senhorasantana@udv.org.br')

  const ensureUsuario = async (
    pessoaId: string,
    role:
      | 'admin'
      | 'responsavel_emporio'
      | 'tesoureiro_1'
      | 'presidencia'
      | 'representante_nucleo',
    nucleoId: string | null,
  ) => {
    const exists = (
      await db.select().from(usuarios).where(eq(usuarios.pessoaId, pessoaId)).limit(1)
    )[0]
    if (!exists) await db.insert(usuarios).values({ pessoaId, role, nucleoId })
  }
  await ensureUsuario(admin.id, 'admin', null)
  await ensureUsuario(operador.id, 'responsavel_emporio', nucleoDev.id)
  await ensureUsuario(tesoureiro.id, 'tesoureiro_1', nucleoDev.id)
  await ensureUsuario(presidente.id, 'presidencia', nucleoDev.id)
  await ensureUsuario(representante.id, 'representante_nucleo', nucleoDev.id)
  await ensureUsuario(tesouraria.id, 'tesoureiro_1', nucleoDev.id)
  await db
    .insert(pessoaNucleo)
    .values(
      [operador, tesoureiro, presidente, representante, tesouraria].map((p) => ({
        pessoaId: p.id,
        nucleoId: nucleoDev.id,
      })),
    )
    .onConflictDoNothing()

  console.log(`Seed OK: ${totalReg} regiões, ${totalNuc} núcleos`)
  console.log(`  dev núcleo: ${nucleoDev.nome} (${nucleoDev.id})`)
  console.log('  dev-login (.pdv.local): admin / caixa (responsável) / tesoureiro')
  console.log(
    '  dev-login Senhora Santana: pres.senhorasantana@udv.org.br / repres… / tes… @udv.org.br',
  )
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
