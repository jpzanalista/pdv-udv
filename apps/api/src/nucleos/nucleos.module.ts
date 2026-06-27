import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { RolesGuard } from '../common/roles.guard'
import { NucleosController } from './nucleos.controller'
import { NucleosService } from './nucleos.service'

@Module({
  imports: [AuthModule],
  controllers: [NucleosController],
  providers: [NucleosService, RolesGuard],
})
export class NucleosModule {}
