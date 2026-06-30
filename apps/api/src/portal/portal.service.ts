import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { type Database, contas, lancamentos, nucleos, pessoas } from '@pdv-udv/db'
import { and, eq, ne } from 'drizzle-orm'
import { bloqueioFechamento } from '../common/timezone'
import { ContasService } from '../contas/contas.service'
import { DB } from '../db/db.module'

const toCents = (v: string | null) => Math.round(Number(v ?? 0) * 100)

@Injectable()
export class PortalService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly contasService: ContasService,
  ) {}

  /** Contas do sócio (titular) com saldo em aberto. */
  async minhasContas(pessoaId: string) {
    const rows = await this.db
      .select({ id: contas.id, nome: contas.nome, tipo: contas.tipo })
      .from(contas)
      .where(eq(contas.titularPessoaId, pessoaId))

    const out: { id: string; nome: string; tipo: string; saldoCents: number }[] = []
    for (const c of rows) {
      const movs = await this.db
        .select({ tipo: lancamentos.tipo, valor: lancamentos.valor })
        .from(lancamentos)
        .where(eq(lancamentos.contaId, c.id))
      const saldoCents = movs.reduce(
        (s, m) => s + (m.tipo === 'debito' ? 1 : -1) * toCents(m.valor),
        0,
      )
      out.push({ ...c, saldoCents })
    }
    return out
  }

  /** Pix está bloqueado agora (fechamento mensal)? Baseado no núcleo das contas do sócio. */
  async statusFechamento(pessoaId: string) {
    const [row] = await this.db
      .select({ timezone: nucleos.timezone, corteDia: nucleos.corteDia })
      .from(contas)
      .innerJoin(nucleos, eq(nucleos.id, contas.nucleoId))
      .where(eq(contas.titularPessoaId, pessoaId))
      .limit(1)
    if (!row) return { bloqueado: false, reabreEm: null as string | null }
    const { bloqueado, reabreEm } = bloqueioFechamento(new Date(), row.timezone, row.corteDia)
    return { bloqueado, reabreEm: bloqueado ? reabreEm.toISOString() : null }
  }

  /** Dados do próprio sócio (nome + se já tem CPF). */
  async perfil(pessoaId: string) {
    const [p] = await this.db
      .select({ nome: pessoas.nome, cpf: pessoas.cpf })
      .from(pessoas)
      .where(eq(pessoas.id, pessoaId))
      .limit(1)
    return { nome: p?.nome ?? null, cpf: p?.cpf ?? null }
  }

  /** Sócio cadastra o próprio CPF (destrava o Pix). Não sobrescreve um CPF já existente. */
  async definirCpf(pessoaId: string, cpf: string) {
    const [p] = await this.db
      .select({ cpf: pessoas.cpf })
      .from(pessoas)
      .where(eq(pessoas.id, pessoaId))
      .limit(1)
    if (!p) throw new NotFoundException('Cadastro não encontrado')
    if (p.cpf) throw new BadRequestException('Você já tem um CPF cadastrado. Procure o empório para alterar.')

    const [outro] = await this.db
      .select({ id: pessoas.id })
      .from(pessoas)
      .where(and(eq(pessoas.cpf, cpf), ne(pessoas.id, pessoaId)))
      .limit(1)
    if (outro) throw new BadRequestException('Este CPF já está cadastrado para outra pessoa.')

    await this.db.update(pessoas).set({ cpf }).where(eq(pessoas.id, pessoaId))
    return { cpf }
  }

  /** Extrato da própria conta (valida que pertence ao sócio) — reaproveita ContasService. */
  async extrato(pessoaId: string, contaId: string) {
    const [conta] = await this.db
      .select({ nucleoId: contas.nucleoId })
      .from(contas)
      .where(and(eq(contas.id, contaId), eq(contas.titularPessoaId, pessoaId)))
      .limit(1)
    if (!conta) throw new ForbiddenException('Conta não pertence a você')
    return this.contasService.extrato(conta.nucleoId, contaId)
  }
}
