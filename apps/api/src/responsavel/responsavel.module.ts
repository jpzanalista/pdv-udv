import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { RolesGuard } from '../common/roles.guard'
import { EmailModule } from '../email/email.module'
import { EmporioAuthController } from './emporio-auth.controller'
import { ResponsaveisController } from './responsaveis.controller'
import { ResponsavelService } from './responsavel.service'

@Module({
  imports: [AuthModule, EmailModule],
  controllers: [EmporioAuthController, ResponsaveisController],
  providers: [ResponsavelService, RolesGuard],
})
export class ResponsavelModule {}
