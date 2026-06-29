import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  type Database,
  contas,
  corteItens,
  cortes,
  lancamentos,
  nucleos,
} from '@pdv-udv/db'
import { and, desc, eq, sql } from 'drizzle-orm'
import { anoMesLocal, instanteLocal } from '../common/timezone'
import { DB } from '../db/db.module'

const reais = (cents: number) => (cents / 100).toFixed(2)
const toCents = (v: string | null) => Math.round(Number(v ?? 0) * 100)
const ym = (ano: number, mes: number) => `${ano}-${String(mes).padStart(2, '0')}`

type Config = { timezone: string; corteDia: number; corteHora: string }

@Injectable()
export class CortesService {
  constructor(@Inject(DB) private readonly db: Database) {}

  private async config(nucleoId: string): Promise<Config> {
    const [n] = await this.db
      .select({ timezone: nucleos.timezone, corteDia: nucleos.corteDia, corteHora: nucleos.corteHora })
      .from(nucleos)
      .where(eq(nucleos.id, nucleoId))
      .limit(1)
    if (!n) throw new NotFoundException('Núcleo não encontrado')
    return n
  }

  /** Instante-limite (UTC) do corte da competência: dia/hora no fuso do núcleo. */
  private limite(competencia: string, cfg: Config): Date {
    const [ano, mes] = competencia.split('-').map(Number)
    const [hh, mm] = cfg.corteHora.split(':').map(Number)
    return instanteLocal(ano, mes - 1, cfg.corteDia, hh, mm, cfg.timezone)
  }

  /** Janela [de, até) da competência. `até` = limite da competência; `de` = limite do mês anterior. */
  private janela(competencia: string, cfg: Config): { periodoDe: Date; periodoAte: Date } {
    const [ano, mes] = competencia.split('-').map(Number)
    const anterior = mes === 1 ? ym(ano - 1, 12) : ym(ano, mes - 1)
    return { periodoDe: this.limite(anterior, cfg), periodoAte: this.limite(competencia, cfg) }
  }

  /** Competência cujo limite já passou mais recentemente (o corte "devido"). */
  private competenciaDevida(cfg: Config): string {
    const agora = new Date()
    const { ano, mes } = anoMesLocal(agora, cfg.timezone)
    const limiteEsteMes = this.limite(ym(ano, mes), cfg)
    if (agora.getTime() >= limiteEsteMes.getTime()) return ym(ano, mes)
    return mes === 1 ? ym(ano - 1, 12) : ym(ano, mes - 1)
  }

  /** Soma do saldo em aberto (não cortado) de cada sócio até o limite. Só saldo > 0, alfabético. */
  private async itensAbertos(nucleoId: string, periodoAte: Date) {
    const rows = await this.db
      .select({
        contaId: contas.id,
        nome: contas.nome,
        saldo: sql<string>`sum(case when ${lancamentos.tipo} = 'debito' then ${lancamentos.valor} else -${lancamentos.valor} end)`,
      })
      .from(lancamentos)
      .innerJoin(contas, eq(contas.id, lancamentos.contaId))
      .where(
        and(
          eq(lancamentos.nucleoId, nucleoId),
          eq(contas.tipo, 'socio'),
          sql`${lancamentos.corteId} is null`,
          sql`${lancamentos.createdAt} < ${periodoAte.toISOString()}`,
        ),
      )
      .groupBy(contas.id, contas.nome)

    return rows
      .map((r) => ({ contaId: r.contaId, clienteNome: r.nome, valorCents: toCents(r.saldo) }))
      .filter((r) => r.valorCents > 0)
      .sort((a, b) => a.clienteNome.localeCompare(b.clienteNome, 'pt-BR'))
  }

  /** Prévia do corte (sem gravar). Se já fechado, mostra o snapshot. */
  async previa(nucleoId: string, competencia?: string) {
    const cfg = await this.config(nucleoId)
    const comp = competencia ?? this.competenciaDevida(cfg)
    const { periodoDe, periodoAte } = this.janela(comp, cfg)

    const [existente] = await this.db
      .select()
      .from(cortes)
      .where(and(eq(cortes.nucleoId, nucleoId), eq(cortes.competencia, comp)))
      .limit(1)

    if (existente) {
      const its = await this.db
        .select({ clienteNome: corteItens.clienteNome, valorCents: corteItens.valorCents })
        .from(corteItens)
        .where(eq(corteItens.corteId, existente.id))
        .orderBy(corteItens.clienteNome)
      return {
        competencia: comp,
        periodoDe,
        periodoAte,
        jaFechado: true,
        corteId: existente.id,
        executadoEm: existente.executadoEm,
        totalCents: existente.totalCents,
        qtdSocios: existente.qtdSocios,
        itens: its,
      }
    }

    const itens = await this.itensAbertos(nucleoId, periodoAte)
    return {
      competencia: comp,
      periodoDe,
      periodoAte,
      jaFechado: false,
      corteId: null,
      executadoEm: null,
      totalCents: itens.reduce((s, i) => s + i.valorCents, 0),
      qtdSocios: itens.length,
      itens: itens.map((i) => ({ clienteNome: i.clienteNome, valorCents: i.valorCents })),
    }
  }

  /** Fecha o corte: grava snapshot + baixa o saldo dos sócios (crédito → tesouraria). Idempotente. */
  async fechar(nucleoId: string, competencia: string, executadoPor: string | null) {
    const cfg = await this.config(nucleoId)
    const { periodoDe, periodoAte } = this.janela(competencia, cfg)

    return this.db.transaction(async (tx) => {
      const [existente] = await tx
        .select({ id: cortes.id })
        .from(cortes)
        .where(and(eq(cortes.nucleoId, nucleoId), eq(cortes.competencia, competencia)))
        .limit(1)
      if (existente) throw new BadRequestException(`O corte de ${competencia} já foi fechado.`)

      const itens = await this.itensAbertos(nucleoId, periodoAte)
      if (itens.length === 0) throw new BadRequestException('Nenhum sócio com saldo em aberto no período.')

      const totalCents = itens.reduce((s, i) => s + i.valorCents, 0)
      const [corte] = await tx
        .insert(cortes)
        .values({
          nucleoId,
          competencia,
          periodoDe,
          periodoAte,
          totalCents,
          qtdSocios: itens.length,
          executadoPor: executadoPor ?? null,
        })
        .returning()

      await tx.insert(corteItens).values(
        itens.map((i) => ({
          corteId: corte.id,
          contaId: i.contaId,
          clienteNome: i.clienteNome,
          valorCents: i.valorCents,
        })),
      )

      // Baixa: crédito que zera o saldo do sócio (p/ o empório, pago; transferido à tesouraria).
      const [yy, mm] = competencia.split('-')
      await tx.insert(lancamentos).values(
        itens.map((i) => ({
          nucleoId,
          contaId: i.contaId,
          tipo: 'credito' as const,
          valor: reais(i.valorCents),
          corteId: corte.id,
          descricao: `Corte ${mm}/${yy} → tesouraria`,
        })),
      )

      return { id: corte.id, competencia, totalCents, qtdSocios: itens.length }
    })
  }

  /**
   * Fecha automaticamente o corte DEVIDO (último limite que já passou) de cada núcleo,
   * pulando os já fechados e os sem sócios em aberto. Idempotente. `executadoPor` = null.
   */
  async fecharDevidosAutomatico() {
    const ns = await this.db
      .select({
        id: nucleos.id,
        timezone: nucleos.timezone,
        corteDia: nucleos.corteDia,
        corteHora: nucleos.corteHora,
      })
      .from(nucleos)

    const feitos: { nucleoId: string; competencia: string; totalCents: number; qtdSocios: number }[] = []
    for (const n of ns) {
      const comp = this.competenciaDevida(n)
      const [ex] = await this.db
        .select({ id: cortes.id })
        .from(cortes)
        .where(and(eq(cortes.nucleoId, n.id), eq(cortes.competencia, comp)))
        .limit(1)
      if (ex) continue // já fechado
      try {
        const r = await this.fechar(n.id, comp, null)
        feitos.push({ nucleoId: n.id, ...r })
      } catch {
        // período sem sócios em aberto (ou corrida com outro fechamento) → ignora
      }
    }
    return feitos
  }

  /** Cortes já fechados (mais recentes primeiro). */
  listar(nucleoId: string) {
    return this.db
      .select({
        id: cortes.id,
        competencia: cortes.competencia,
        periodoDe: cortes.periodoDe,
        periodoAte: cortes.periodoAte,
        totalCents: cortes.totalCents,
        qtdSocios: cortes.qtdSocios,
        executadoEm: cortes.executadoEm,
      })
      .from(cortes)
      .where(eq(cortes.nucleoId, nucleoId))
      .orderBy(desc(cortes.competencia))
  }

  /** Detalhe (snapshot) de um corte fechado, para reimpressão/exportação. */
  async detalhe(nucleoId: string, corteId: string) {
    const [c] = await this.db
      .select()
      .from(cortes)
      .where(and(eq(cortes.nucleoId, nucleoId), eq(cortes.id, corteId)))
      .limit(1)
    if (!c) throw new NotFoundException('Corte não encontrado')
    const itens = await this.db
      .select({ clienteNome: corteItens.clienteNome, valorCents: corteItens.valorCents })
      .from(corteItens)
      .where(eq(corteItens.corteId, c.id))
      .orderBy(corteItens.clienteNome)
    return {
      competencia: c.competencia,
      periodoDe: c.periodoDe,
      periodoAte: c.periodoAte,
      totalCents: c.totalCents,
      qtdSocios: c.qtdSocios,
      executadoEm: c.executadoEm,
      itens,
    }
  }
}
