import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AsaasModule } from './asaas/asaas.module'
import { AuthModule } from './auth/auth.module'
import { CatalogoModule } from './catalogo/catalogo.module'
import { ContasModule } from './contas/contas.module'
import { CortesModule } from './cortes/cortes.module'
import { DbModule } from './db/db.module'
import { ExpedientesModule } from './expedientes/expedientes.module'
import { HealthController } from './health/health.controller'
import { NucleosModule } from './nucleos/nucleos.module'
import { PessoasModule } from './pessoas/pessoas.module'
import { PortalModule } from './portal/portal.module'
import { RegioesModule } from './regioes/regioes.module'
import { RelatoriosModule } from './relatorios/relatorios.module'
import { ResponsavelModule } from './responsavel/responsavel.module'
import { VendasModule } from './vendas/vendas.module'

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
    VendasModule,
    ExpedientesModule,
    PortalModule,
    AsaasModule,
    RelatoriosModule,
    ResponsavelModule,
    CortesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
