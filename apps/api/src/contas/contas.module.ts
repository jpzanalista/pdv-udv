import { Module } from '@nestjs/common'
import { AsaasModule } from '../asaas/asaas.module'
import { AuthModule } from '../auth/auth.module'
import { RolesGuard } from '../common/roles.guard'
import { ContasController } from './contas.controller'
import { ContasService } from './contas.service'

@Module({
  imports: [AuthModule, AsaasModule],
  controllers: [ContasController],
  providers: [ContasService, RolesGuard],
  exports: [ContasService],
})
export class ContasModule {}
