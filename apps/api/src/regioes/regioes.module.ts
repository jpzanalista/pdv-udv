import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { RegioesController } from './regioes.controller'
import { RegioesService } from './regioes.service'

@Module({
  imports: [AuthModule],
  controllers: [RegioesController],
  providers: [RegioesService],
})
export class RegioesModule {}
