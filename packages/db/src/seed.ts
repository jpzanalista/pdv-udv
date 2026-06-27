import { eq } from 'drizzle-orm'
import { createDb } from './client.js'
import { nucleos, pessoaNucleo, pessoas, usuarios } from './schema.js'

const url = process.env.DATABASE_URL ?? 'postgresql://pdv:pdv@localhost:5440/pdv'

function req<T>(v: T | undefined, msg: string): T {
  if (v === undefined) throw new Error(msg)
  return v
}

async function main() {
  const db = createDb(url)

  // Núcleo de teste
  await db
    .insert(nucleos)
    .values({ nome: 'Núcleo Teste', cnpj: '00000000000191', regiao: 'Sede' })
    .onConflictDoNothing({ target: nucleos.cnpj })
  const nucleo = req(
    (await db.select().from(nucleos).where(eq(nucleos.cnpj, '00000000000191')).limit(1))[0],
    'núcleo não criado',
  )

  // Pessoas (admin + operador)
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

  // Usuários (idempotente: só insere se não existir)
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
  await ensureUsuario(operador.id, 'responsavel_emporio', nucleo.id)

  await db
    .insert(pessoaNucleo)
    .values({ pessoaId: operador.id, nucleoId: nucleo.id })
    .onConflictDoNothing()

  console.log('Seed OK:')
  console.log('  núcleo:', nucleo.id, nucleo.nome)
  console.log('  admin  -> dev-login com email: admin@pdv.local (role admin, sem núcleo)')
  console.log('  caixa  -> dev-login com email: caixa@pdv.local (role responsavel_emporio, com núcleo)')
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
