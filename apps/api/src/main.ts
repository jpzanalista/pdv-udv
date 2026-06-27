import 'reflect-metadata'
import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api')
  app.enableCors({ origin: true, credentials: true })
  // Validação é feita por rota com ZodValidationPipe (sem class-validator).

  const port = Number(process.env.API_PORT ?? 3333)
  await app.listen(port, '0.0.0.0')
  Logger.log(`API ouvindo em http://localhost:${port}/api`, 'Bootstrap')
}

void bootstrap()
