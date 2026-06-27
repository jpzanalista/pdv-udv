import { Inject, Injectable } from '@nestjs/common'
import { type Database, contaMembros, contas, pessoas } from '@pdv-udv/db'
import type { ContaImportRow, CreateContaInput, ImportContasInput } from '@pdv-udv/shared'
import { and, asc, eq } from 'drizzle-orm'
import { DB } from '../db/db.module'

@Injectable()
export class ContasService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async create(nucleoId: string, input: CreateContaInput) {
    const [conta] = await this.db
      .insert(contas)
      .values({
        nucleoId,
        tipo: input.tipo,
        nome: input.nome,
        titularPessoaId: input.titularPessoaId,
        descontoPct: input.descontoPct != null ? String(input.descontoPct) : undefined,
      })
      .returning()

    if (input.membros?.length) {
      await this.db
        .insert(contaMembros)
        .values(input.membros.map((pessoaId) => ({ contaId: conta.id, pessoaId })))
    }
    return conta
  }

  list(nucleoId: string) {
    return this.db
      .select({
        id: contas.id,
        nome: contas.nome,
        tipo: contas.tipo,
        descontoPct: contas.descontoPct,
        ativa: contas.ativa,
        createdAt: contas.createdAt,
        titularNome: pessoas.nome,
        titularCpf: pessoas.cpf,
        titularWhatsapp: pessoas.whatsapp,
      })
      .from(contas)
      .leftJoin(pessoas, eq(contas.titularPessoaId, pessoas.id))
      .where(eq(contas.nucleoId, nucleoId))
      .orderBy(asc(contas.nome))
  }

  get(nucleoId: string, id: string) {
    return this.db
      .select()
      .from(contas)
      .where(and(eq(contas.nucleoId, nucleoId), eq(contas.id, id)))
      .limit(1)
  }

  /**
   * Import em massa via Excel (ex.: clientes do TaurusPOS).
   * Dedupe por nome dentro do núcleo (re-import é idempotente).
   * Se houver CPF (11 dígitos), faz upsert da pessoa por CPF e a liga como titular.
   */
  async importar(nucleoId: string, input: ImportContasInput) {
    const existentes = await this.db
      .select({ id: contas.id, nome: contas.nome })
      .from(contas)
      .where(eq(contas.nucleoId, nucleoId))
    const byNome = new Map(existentes.map((c) => [c.nome.trim().toLowerCase(), c.id]))

    let criadas = 0
    let atualizadas = 0
    for (const r of input.contas) {
      const nome = r.nome.trim()
      const nomeKey = nome.toLowerCase()
      const titularPessoaId = await this.resolverTitular(r)
      const tipo = r.tipo ?? 'familiar'
      const descontoPct = r.descontoPct != null ? String(r.descontoPct) : undefined

      const existingId = byNome.get(nomeKey)
      if (existingId) {
        const set: Partial<typeof contas.$inferInsert> = { tipo }
        if (titularPessoaId) set.titularPessoaId = titularPessoaId
        if (descontoPct != null) set.descontoPct = descontoPct
        await this.db.update(contas).set(set).where(eq(contas.id, existingId))
        atualizadas++
      } else {
        const [c] = await this.db
          .insert(contas)
          .values({ nucleoId, tipo, nome, titularPessoaId, descontoPct })
          .returning({ id: contas.id })
        byNome.set(nomeKey, c.id)
        criadas++
      }
    }
    return { criadas, atualizadas }
  }

  /** Resolve (ou cria) a pessoa titular pelo CPF. Sem CPF de 11 dígitos → sem titular. */
  private async resolverTitular(r: ContaImportRow): Promise<string | undefined> {
    const cpf = r.cpf?.replace(/\D/g, '')
    if (!cpf || cpf.length !== 11) return undefined

    const [existing] = await this.db
      .select({ id: pessoas.id })
      .from(pessoas)
      .where(eq(pessoas.cpf, cpf))
      .limit(1)
    if (existing) {
      if (r.whatsapp) {
        await this.db.update(pessoas).set({ whatsapp: r.whatsapp }).where(eq(pessoas.id, existing.id))
      }
      return existing.id
    }

    const [p] = await this.db
      .insert(pessoas)
      .values({ cpf, nome: r.nome.trim(), whatsapp: r.whatsapp ?? undefined })
      .returning({ id: pessoas.id })
    return p.id
  }
}
