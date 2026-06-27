import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { CatalogoModule } from './catalogo/catalogo.module'
import { ContasModule } from './contas/contas.module'
import { DbModule } from './db/db.module'
import { HealthController } from './health/health.controller'
import { NucleosModule } from './nucleos/nucleos.module'
import { PessoasModule } from './pessoas/pessoas.module'
import { RegioesModule } from './regioes/regioes.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    DbModule,
    AuthModule,
    RegioesModule,
    NucleosModule,
    PessoasModule,
    ContasModule,
    CatalogoModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
