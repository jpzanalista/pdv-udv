import { Injectable, Logger } from '@nestjs/common'
import nodemailer from 'nodemailer'

/**
 * Envio de e-mail com SMTP trocável por env.
 * - SMTP_HOST setada → envia de verdade (nodemailer).
 * - sem env          → fallback dev: registra o e-mail (com o link) no log.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger('Email')

  async enviar(to: string, assunto: string, texto: string): Promise<void> {
    const host = process.env.SMTP_HOST
    if (!host) {
      if (process.env.NODE_ENV === 'production') {
        // Não loga o link (que dá acesso a definir senha) nem finge sucesso.
        this.logger.error('SMTP_HOST não configurado — e-mail indisponível em produção')
        throw new Error('Serviço de e-mail indisponível')
      }
      this.logger.warn(`[DEV] E-mail p/ ${to} | ${assunto}\n${texto}`)
      return
    }
    const transport = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    })
    await transport.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to,
      subject: assunto,
      text: texto,
    })
  }
}
