import { Controller, Get, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RegioesService } from './regioes.service'

@Controller('regioes')
@UseGuards(JwtAuthGuard)
export class RegioesController {
  constructor(private readonly regioes: RegioesService) {}

  @Get()
  list() {
    return this.regioes.list()
  }
}
