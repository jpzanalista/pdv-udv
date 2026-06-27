import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { PessoasController } from './pessoas.controller'
import { PessoasService } from './pessoas.service'

@Module({
  imports: [AuthModule],
  controllers: [PessoasController],
  providers: [PessoasService],
})
export class PessoasModule {}
