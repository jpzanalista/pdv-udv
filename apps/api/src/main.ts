import 'reflect-metadata'
import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { NextFunction, Request, Response } from 'express'
import { AppModule } from './app.module'

function exigir(nome: string) {
  if (!process.env[nome]) throw new Error(`Variável de ambiente obrigatória ausente: ${nome}`)
}

// Origens permitidas: dev (localhost/LAN) + subdomínios *.emporio.cloud + extras via CORS_ORIGINS.
const extraOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
function origemPermitida(origin: string): boolean {
  if (/^https?:\/\/(localhost|127\.0\.0\.1|(\d{1,3}\.){3}\d{1,3})(:\d+)?$/.test(origin)) return true
  if (/^https:\/\/([a-z0-9-]+\.)*emporio\.cloud$/.test(origin)) return true
  return extraOrigins.includes(origin)
}

async function bootstrap() {
  // Cria o app primeiro: o ConfigModule carrega o .env para process.env aqui.
  const app = await NestFactory.create(AppModule)
  exigir('JWT_SECRET')
  exigir('JWT_REFRESH_SECRET')
  app.setGlobalPrefix('api')

  app.enableCors({
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) =>
      cb(null, !origin || origemPermitida(origin)),
    credentials: true,
  })

  // Headers de segurança básicos (HSTS/CSP ficam no proxy Caddy em produção).
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.setHeader('X-DNS-Prefetch-Control', 'off')
    next()
  })

  const port = Number(process.env.API_PORT ?? 3333)
  await app.listen(port, '0.0.0.0')
  Logger.log(`API ouvindo em http://localhost:${port}/api`, 'Bootstrap')
}

void bootstrap()
