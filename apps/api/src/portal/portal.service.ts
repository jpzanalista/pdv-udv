import { ForbiddenException, Inject, Injectable } from '@nestjs/common'
import { type Database, contas, lancamentos, nucleos } from '@pdv-udv/db'
import { and, eq } from 'drizzle-orm'
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
