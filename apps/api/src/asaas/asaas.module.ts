import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { RolesGuard } from '../common/roles.guard'
import { AsaasController } from './asaas.controller'
import { AsaasService } from './asaas.service'
import { CobrancasService } from './cobrancas.service'

@Module({
  imports: [AuthModule],
  controllers: [AsaasController],
  providers: [AsaasService, CobrancasService, RolesGuard],
  exports: [CobrancasService],
})
export class AsaasModule {}
