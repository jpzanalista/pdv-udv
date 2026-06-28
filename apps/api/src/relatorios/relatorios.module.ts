import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { RolesGuard } from '../common/roles.guard'
import { RelatoriosController } from './relatorios.controller'
import { RelatoriosService } from './relatorios.service'

@Module({
  imports: [AuthModule],
  controllers: [RelatoriosController],
  providers: [RelatoriosService, RolesGuard],
})
export class RelatoriosModule {}
