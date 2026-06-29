import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { RolesGuard } from '../common/roles.guard'
import { CortesController } from './cortes.controller'
import { CortesService } from './cortes.service'

@Module({
  imports: [AuthModule],
  controllers: [CortesController],
  providers: [CortesService, RolesGuard],
  exports: [CortesService],
})
export class CortesModule {}
