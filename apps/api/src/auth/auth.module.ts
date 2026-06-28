import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { WhatsappModule } from '../whatsapp/whatsapp.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { CognitoService } from './cognito.service'
import { JwtAuthGuard } from './jwt-auth.guard'
import { OtpService } from './otp.service'
import { TokenService } from './token.service'

@Module({
  imports: [JwtModule.register({}), WhatsappModule],
  controllers: [AuthController],
  providers: [AuthService, CognitoService, TokenService, JwtAuthGuard, OtpService],
  exports: [TokenService, JwtAuthGuard],
})
export class AuthModule {}
