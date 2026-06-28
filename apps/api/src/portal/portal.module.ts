import { Module } from '@nestjs/common'
import { AsaasModule } from '../asaas/asaas.module'
import { AuthModule } from '../auth/auth.module'
import { RolesGuard } from '../common/roles.guard'
import { ContasModule } from '../contas/contas.module'
import { PortalController } from './portal.controller'
import { PortalService } from './portal.service'

@Module({
  imports: [AuthModule, ContasModule, AsaasModule],
  controllers: [PortalController],
  providers: [PortalService, RolesGuard],
})
export class PortalModule {}
