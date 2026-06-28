import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { RolesGuard } from '../common/roles.guard'
import { ContasModule } from '../contas/contas.module'
import { PortalController } from './portal.controller'
import { PortalService } from './portal.service'

@Module({
  imports: [AuthModule, ContasModule],
  controllers: [PortalController],
  providers: [PortalService, RolesGuard],
})
export class PortalModule {}
