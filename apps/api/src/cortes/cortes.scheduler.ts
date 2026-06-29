import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { CortesService } from './cortes.service'

/**
 * Roda o corte automático no fuso de cada núcleo. Em vez de cron por núcleo, um timer
 * verifica periodicamente quais cortes já são DEVIDOS e ainda não foram fechados.
 * Idempotente (unique nucleo+competência). Desligar com CORTE_SCHEDULER=off.
 */
@Injectable()
export class CorteScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('CorteScheduler')
  private timer?: ReturnType<typeof setInterval>
  private rodando = false

  constructor(private readonly cortes: CortesService) {}

  onModuleInit() {
    if (process.env.CORTE_SCHEDULER === 'off') {
      this.logger.warn('Agendador de corte desligado (CORTE_SCHEDULER=off)')
      return
    }
    const ms = Number(process.env.CORTE_SCHEDULER_MS) || 5 * 60_000 // 5 min
    this.timer = setInterval(() => this.tick(), ms)
    setTimeout(() => this.tick(), 15_000) // primeira passada logo após subir
    this.logger.log(`Agendador de corte ativo (a cada ${Math.round(ms / 1000)}s)`)
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer)
  }

  private async tick() {
    if (this.rodando) return // evita sobreposição
    this.rodando = true
    try {
      const feitos = await this.cortes.fecharDevidosAutomatico()
      for (const f of feitos) {
        this.logger.log(
          `Corte automático: núcleo ${f.nucleoId} ${f.competencia} — ${f.qtdSocios} sócio(s), total ${(f.totalCents / 100).toFixed(2)}`,
        )
      }
    } catch (e) {
      this.logger.error(`Falha no agendador de corte: ${e instanceof Error ? e.message : e}`)
    } finally {
      this.rodando = false
    }
  }
}
