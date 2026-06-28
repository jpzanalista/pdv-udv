import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { type Database, contaMembros, contas, lancamentos, pessoas, vendaItens, vendas } from '@pdv-udv/db'
import type { CreateContaInput, ImportContasInput, UpdateContaInput } from '@pdv-udv/shared'
import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { DB } from '../db/db.module'

const toCents = (v: string | null) => Math.round(Number(v ?? 0) * 100)

@Injectable()
export class ContasService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async create(nucleoId: string, input: CreateContaInput) {
    const titularPessoaId = input.cpf
      ? await this.resolverTitular(input.cpf, input.whatsapp, input.nome.trim())
      : input.titularPessoaId

    const [conta] = await this.db
      .insert(contas)
      .values({
        nucleoId,
        tipo: input.tipo,
        nome: input.nome,
        titularPessoaId,
        descontoPct: input.descontoPct != null ? String(input.descontoPct) : undefined,
        ativa: input.ativa ?? undefined,
      })
      .returning()

    if (input.membros?.length) {
      await this.db
        .insert(contaMembros)
        .values(input.membros.map((pessoaId) => ({ contaId: conta.id, pessoaId })))
    }
    return conta
  }

  async atualizar(nucleoId: string, id: string, patch: UpdateContaInput) {
    const [atual] = await this.db
      .select({ id: contas.id, nome: contas.nome })
      .from(contas)
      .where(and(eq(contas.nucleoId, nucleoId), eq(contas.id, id)))
      .limit(1)
    if (!atual) throw new NotFoundException('Conta não encontrada')

    const set: Partial<typeof contas.$inferInsert> = {}
    if (patch.nome !== undefined) set.nome = patch.nome
    if (patch.tipo !== undefined) set.tipo = patch.tipo
    if (patch.ativa !== undefined) set.ativa = patch.ativa
    if (patch.descontoPct !== undefined) set.descontoPct = String(patch.descontoPct)
    if (patch.cpf) {
      const titularPessoaId = await this.resolverTitular(patch.cpf, patch.whatsapp, patch.nome ?? atual.nome)
      if (titularPessoaId) set.titularPessoaId = titularPessoaId
    }

    const [row] = await this.db
      .update(contas)
      .set(set)
      .where(and(eq(contas.nucleoId, nucleoId), eq(contas.id, id)))
      .returning()
    return row
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

  /** Extrato: saldo em aberto + movimentos (compras com itens, e pagamentos). */
  async extrato(nucleoId: string, id: string) {
    const [conta] = await this.db
      .select({ id: contas.id, nome: contas.nome, tipo: contas.tipo })
      .from(contas)
      .where(and(eq(contas.nucleoId, nucleoId), eq(contas.id, id)))
      .limit(1)
    if (!conta) throw new NotFoundException('Conta não encontrada')

    const movs = await this.db
      .select()
      .from(lancamentos)
      .where(and(eq(lancamentos.nucleoId, nucleoId), eq(lancamentos.contaId, id)))
      .orderBy(desc(lancamentos.createdAt))

    // Busca os itens das vendas vinculadas (o "o que comprou"), em uma tacada só.
    const vendaIds = movs.map((m) => m.vendaId).filter((v): v is string => !!v)
    const numeroByVenda = new Map<string, number>()
    const itensByVenda = new Map<string, { descricao: string; qtde: number; totalCents: number }[]>()
    if (vendaIds.length) {
      const vs = await this.db
        .select({ id: vendas.id, numero: vendas.numero })
        .from(vendas)
        .where(inArray(vendas.id, vendaIds))
      for (const v of vs) numeroByVenda.set(v.id, v.numero)
      const its = await this.db.select().from(vendaItens).where(inArray(vendaItens.vendaId, vendaIds))
      for (const it of its) {
        const arr = itensByVenda.get(it.vendaId) ?? []
        arr.push({ descricao: it.descricao, qtde: Number(it.qtde), totalCents: toCents(it.total) })
        itensByVenda.set(it.vendaId, arr)
      }
    }

    let saldoCents = 0
    const movimentos = movs.map((m) => {
      const valorCents = toCents(m.valor)
      saldoCents += m.tipo === 'debito' ? valorCents : -valorCents
      const venda = m.vendaId
        ? { numero: numeroByVenda.get(m.vendaId) ?? null, itens: itensByVenda.get(m.vendaId) ?? [] }
        : null
      return { id: m.id, data: m.createdAt, tipo: m.tipo, valorCents, descricao: m.descricao, venda }
    })

    return { conta, saldoCents, movimentos }
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
      const titularPessoaId = await this.resolverTitular(r.cpf, r.whatsapp, nome)
      const tipo = r.tipo ?? 'socio'
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
  private async resolverTitular(
    cpfRaw: string | undefined,
    whatsapp: string | undefined,
    nome: string,
  ): Promise<string | undefined> {
    const cpf = cpfRaw?.replace(/\D/g, '')
    if (!cpf || cpf.length !== 11) return undefined

    const [existing] = await this.db
      .select({ id: pessoas.id })
      .from(pessoas)
      .where(eq(pessoas.cpf, cpf))
      .limit(1)
    if (existing) {
      if (whatsapp) {
        await this.db.update(pessoas).set({ whatsapp }).where(eq(pessoas.id, existing.id))
      }
      return existing.id
    }

    const [p] = await this.db
      .insert(pessoas)
      .values({ cpf, nome: nome.trim(), whatsapp: whatsapp ?? undefined })
      .returning({ id: pessoas.id })
    return p.id
  }
}
