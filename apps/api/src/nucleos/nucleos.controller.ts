import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { type CreateNucleoInput, createNucleoSchema } from '@pdv-udv/shared'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../common/roles.decorator'
import { RolesGuard } from '../common/roles.guard'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { NucleosService } from './nucleos.service'

@Controller('nucleos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class NucleosController {
  constructor(private readonly nucleos: NucleosService) {}

  @Post()
  create(@Body(new ZodValidationPipe(createNucleoSchema)) body: CreateNucleoInput) {
    return this.nucleos.create(body)
  }

  @Get()
  list() {
    return this.nucleos.list()
  }
}
