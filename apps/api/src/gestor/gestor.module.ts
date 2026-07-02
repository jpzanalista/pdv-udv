import { Module } from '@nestjs/common'
import { AsaasModule } from '../asaas/asaas.module'
import { AuthModule } from '../auth/auth.module'
import { RolesGuard } from '../common/roles.guard'
import { ResponsavelModule } from '../responsavel/responsavel.module'
import { GestorAuthController } from './gestor-auth.controller'
import { GestorController } from './gestor.controller'
import { GestorService } from './gestor.service'

@Module({
  imports: [AuthModule, ResponsavelModule, AsaasModule],
  controllers: [GestorAuthController, GestorController],
  providers: [GestorService, RolesGuard],
})
export class GestorModule {}
