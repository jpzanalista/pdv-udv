import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { RolesGuard } from '../common/roles.guard'
import { ContasController } from './contas.controller'
import { ContasService } from './contas.service'

@Module({
  imports: [AuthModule],
  controllers: [ContasController],
  providers: [ContasService, RolesGuard],
})
export class ContasModule {}
