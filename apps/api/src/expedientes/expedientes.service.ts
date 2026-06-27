import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common'
import { type Database, expedientes, pagamentos, vendas } from '@pdv-udv/db'
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

  /** Esperado em dinheiro = fundo de troco + vendas em dinheiro do expediente. */
  private async esperadoCents(exp: Expediente): Promise<number> {
    const [{ soma }] = await this.db
      .select({ soma: sql<string>`coalesce(sum(${pagamentos.valor}), 0)` })
      .from(pagamentos)
      .innerJoin(vendas, eq(vendas.id, pagamentos.vendaId))
      .where(and(eq(vendas.expedienteId, exp.id), eq(pagamentos.metodo, 'dinheiro')))
    return Math.round(Number(exp.fundoTroco) * 100) + Math.round(Number(soma) * 100)
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
