import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  type Database,
  caixaMovimentos,
  devolucoes,
  expedientes,
  nucleos,
  pagamentos,
  usuarios,
  vendas,
} from '@pdv-udv/db'
import type { CreateMovimentoInput } from '@pdv-udv/shared'
import { and, desc, eq, sql } from 'drizzle-orm'
import { DB } from '../db/db.module'

const reais = (cents: number) => (cents / 100).toFixed(2)
type Expediente = typeof expedientes.$inferSelect

@Injectable()
export class ExpedientesService {
  constructor(@Inject(DB) private readonly db: Database) {}

  private async abertoDoNucleo(nucleoId: string): Promise<Expediente | undefined> {
    const [exp] = await this.db
      .select()
      .from(expedientes)
      .where(and(eq(expedientes.nucleoId, nucleoId), eq(expedientes.status, 'aberto')))
      .limit(1)
    return exp
  }

  /** Esperado = fundo + vendas em dinheiro − devoluções em dinheiro − sangrias + suprimentos. */
  private async esperadoCents(exp: Expediente): Promise<number> {
    const [{ soma }] = await this.db
      .select({ soma: sql<string>`coalesce(sum(${pagamentos.valor}), 0)` })
      .from(pagamentos)
      .innerJoin(vendas, eq(vendas.id, pagamentos.vendaId))
      .where(and(eq(vendas.expedienteId, exp.id), eq(pagamentos.metodo, 'dinheiro')))

    const [{ devol }] = await this.db
      .select({ devol: sql<string>`coalesce(sum(${devolucoes.valor}), 0)` })
      .from(devolucoes)
      .where(and(eq(devolucoes.expedienteId, exp.id), eq(devolucoes.metodo, 'dinheiro')))

    const [mov] = await this.db
      .select({
        sangria: sql<string>`coalesce(sum(case when ${caixaMovimentos.tipo} = 'sangria' then ${caixaMovimentos.valor} else 0 end), 0)`,
        suprimento: sql<string>`coalesce(sum(case when ${caixaMovimentos.tipo} = 'suprimento' then ${caixaMovimentos.valor} else 0 end), 0)`,
      })
      .from(caixaMovimentos)
      .where(eq(caixaMovimentos.expedienteId, exp.id))

    const c = (v: string) => Math.round(Number(v) * 100)
    return (
      c(exp.fundoTroco) + c(soma) - c(devol) - c(mov?.sangria ?? '0') + c(mov?.suprimento ?? '0')
    )
  }

  async criarMovimento(nucleoId: string, createdBy: string, input: CreateMovimentoInput) {
    const exp = await this.abertoDoNucleo(nucleoId)
    if (!exp) throw new BadRequestException('Abra o caixa antes de registrar movimento')
    const status =
      input.tipo === 'sangria' && input.destino === 'tesouraria' ? ('pendente' as const) : null
    const [mov] = await this.db
      .insert(caixaMovimentos)
      .values({
        nucleoId,
        expedienteId: exp.id,
        tipo: input.tipo,
        destino: input.destino ?? null,
        valor: reais(input.valorCents),
        descricao: input.descricao ?? null,
        recebedor: input.recebedor ?? null,
        status,
        createdBy,
      })
      .returning()
    return mov
  }

  async listarMovimentos(nucleoId: string) {
    const exp = await this.abertoDoNucleo(nucleoId)
    if (!exp) return []
    return this.db
      .select()
      .from(caixaMovimentos)
      .where(eq(caixaMovimentos.expedienteId, exp.id))
      .orderBy(desc(caixaMovimentos.createdAt))
  }

  /** Movimento + nome do núcleo + papel de quem validou (para o recibo). */
  async getMovimento(nucleoId: string, id: string) {
    const [mov] = await this.db
      .select()
      .from(caixaMovimentos)
      .where(and(eq(caixaMovimentos.id, id), eq(caixaMovimentos.nucleoId, nucleoId)))
      .limit(1)
    if (!mov) throw new NotFoundException('Movimento não encontrado')
    const [nuc] = await this.db.select().from(nucleos).where(eq(nucleos.id, nucleoId)).limit(1)

    let validadorRole: string | null = null
    if (mov.validadoPor) {
      const [u] = await this.db
        .select({ role: usuarios.role })
        .from(usuarios)
        .where(eq(usuarios.id, mov.validadoPor))
        .limit(1)
      validadorRole = u?.role ?? null
    }
    return { ...mov, nucleoNome: nuc?.nome ?? null, validadorRole }
  }

  /** Histórico completo de movimentos do núcleo (vitalício) + quem validou. */
  historicoMovimentos(nucleoId: string) {
    return this.db
      .select({
        id: caixaMovimentos.id,
        tipo: caixaMovimentos.tipo,
        destino: caixaMovimentos.destino,
        valor: caixaMovimentos.valor,
        descricao: caixaMovimentos.descricao,
        recebedor: caixaMovimentos.recebedor,
        status: caixaMovimentos.status,
        validadoEm: caixaMovimentos.validadoEm,
        createdAt: caixaMovimentos.createdAt,
        validadorRole: usuarios.role,
      })
      .from(caixaMovimentos)
      .leftJoin(usuarios, eq(usuarios.id, caixaMovimentos.validadoPor))
      .where(eq(caixaMovimentos.nucleoId, nucleoId))
      .orderBy(desc(caixaMovimentos.createdAt))
      .limit(500)
  }

  /** Sangrias para tesouraria pendentes de validação (todas do núcleo). */
  movimentosPendentes(nucleoId: string) {
    return this.db
      .select()
      .from(caixaMovimentos)
      .where(
        and(
          eq(caixaMovimentos.nucleoId, nucleoId),
          eq(caixaMovimentos.tipo, 'sangria'),
          eq(caixaMovimentos.destino, 'tesouraria'),
          eq(caixaMovimentos.status, 'pendente'),
        ),
      )
      .orderBy(desc(caixaMovimentos.createdAt))
  }

  /** Tesoureiro valida uma sangria→tesouraria → habilita o recibo. */
  async validarMovimento(nucleoId: string, validadorId: string, id: string) {
    const [mov] = await this.db
      .select()
      .from(caixaMovimentos)
      .where(and(eq(caixaMovimentos.id, id), eq(caixaMovimentos.nucleoId, nucleoId)))
      .limit(1)
    if (!mov) throw new NotFoundException('Movimento não encontrado')
    if (!(mov.tipo === 'sangria' && mov.destino === 'tesouraria')) {
      throw new BadRequestException('Apenas sangrias para tesouraria precisam de validação')
    }
    if (mov.status !== 'pendente') throw new BadRequestException('Movimento já validado')
    const [updated] = await this.db
      .update(caixaMovimentos)
      .set({ status: 'validada', validadoPor: validadorId, validadoEm: new Date() })
      .where(eq(caixaMovimentos.id, id))
      .returning()
    return updated
  }

  async abrir(nucleoId: string, abertoPor: string, fundoTrocoCents: number) {
    if (await this.abertoDoNucleo(nucleoId)) {
      throw new ConflictException('Já existe um caixa aberto neste núcleo')
    }
    const [exp] = await this.db
      .insert(expedientes)
      .values({ nucleoId, status: 'aberto', fundoTroco: reais(fundoTrocoCents), abertoPor })
      .returning()
    return exp
  }

  async atual(nucleoId: string) {
    const exp = await this.abertoDoNucleo(nucleoId)
    const aberto = exp ? { ...exp, esperadoCents: await this.esperadoCents(exp) } : null

    // Sugestão de fundo = valor contado no último fechamento (o que sobrou no caixa).
    const [ultimo] = await this.db
      .select()
      .from(expedientes)
      .where(and(eq(expedientes.nucleoId, nucleoId), eq(expedientes.status, 'fechado')))
      .orderBy(desc(expedientes.fechadoEm))
      .limit(1)
    const sugestaoFundoCents =
      ultimo?.valorContado != null ? Math.round(Number(ultimo.valorContado) * 100) : null

    return { aberto, sugestaoFundoCents }
  }

  async fechar(nucleoId: string, valorContadoCents: number) {
    const exp = await this.abertoDoNucleo(nucleoId)
    if (!exp) throw new BadRequestException('Não há caixa aberto')
    const esperadoCents = await this.esperadoCents(exp)
    const diferencaCents = valorContadoCents - esperadoCents
    const [updated] = await this.db
      .update(expedientes)
      .set({
        status: 'fechado',
        valorContado: reais(valorContadoCents),
        valorEsperado: reais(esperadoCents),
        diferenca: reais(diferencaCents),
        fechadoEm: new Date(),
      })
      .where(eq(expedientes.id, exp.id))
      .returning()
    return { ...updated, esperadoCents, valorContadoCents, diferencaCents }
  }
}
