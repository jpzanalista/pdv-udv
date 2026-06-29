import { Injectable, Logger } from '@nestjs/common'

/**
 * Envio de WhatsApp com provedor trocável por env.
 * - EVOLUTION_* setadas  → Evolution API (self-hosted).
 * - sem env              → fallback de dev: registra o código no log do servidor.
 * (Meta Cloud API no futuro = só mais um ramo aqui, sem mexer no resto.)
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger('WhatsApp')

  /** Normaliza para dígitos com DDI 55 (ex.: "+55 (63) 99999-0000" → "5563999990000"). */
  private static numero(telefone: string): string {
    let d = telefone.replace(/\D/g, '')
    if (!d.startsWith('55')) d = `55${d}`
    return d
  }

  async sendOtp(telefone: string, codigo: string): Promise<void> {
    await this.sendText(telefone, `Seu código de acesso ao PDV UDV é ${codigo}. Expira em 5 minutos.`)
  }

  /** Envia uma mensagem de texto livre. Sem EVOLUTION_* configurado, loga no servidor (dev). */
  async sendText(telefone: string, text: string): Promise<void> {
    const number = WhatsappService.numero(telefone)

    const url = process.env.EVOLUTION_URL
    const instance = process.env.EVOLUTION_INSTANCE
    const apiKey = process.env.EVOLUTION_API_KEY

    if (!url || !instance || !apiKey) {
      this.logger.warn(`[DEV] WhatsApp p/ ${number}:\n${text}\n(configure EVOLUTION_* para enviar de verdade)`)
      return
    }

    const res = await fetch(`${url.replace(/\/$/, '')}/message/sendText/${instance}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: apiKey },
      body: JSON.stringify({ number, text }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      this.logger.error(`Evolution falhou (${res.status}): ${body}`)
      throw new Error('Falha ao enviar WhatsApp')
    }
  }
}
