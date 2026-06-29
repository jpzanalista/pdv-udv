import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { RolesGuard } from '../common/roles.guard'
import { VendasController } from './vendas.controller'
import { VendasService } from './vendas.service'

@Module({
  imports: [AuthModule],
  controllers: [VendasController],
  providers: [VendasService, RolesGuard],
})
export class VendasModule {}
