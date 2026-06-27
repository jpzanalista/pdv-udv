import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ExpedientesController } from './expedientes.controller'
import { ExpedientesService } from './expedientes.service'

@Module({
  imports: [AuthModule],
  controllers: [ExpedientesController],
  providers: [ExpedientesService],
})
export class ExpedientesModule {}
