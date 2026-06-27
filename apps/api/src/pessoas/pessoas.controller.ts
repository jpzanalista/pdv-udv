import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common'
import { type CreatePessoaInput, createPessoaSchema } from '@pdv-udv/shared'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { PessoasService } from './pessoas.service'

@Controller('pessoas')
@UseGuards(JwtAuthGuard)
export class PessoasController {
  constructor(private readonly pessoas: PessoasService) {}

  @Post()
  create(@Body(new ZodValidationPipe(createPessoaSchema)) body: CreatePessoaInput) {
    return this.pessoas.create(body)
  }

  @Get()
  find(@Query('cpf') cpf?: string) {
    return cpf ? this.pessoas.findByCpf(cpf) : this.pessoas.list()
  }
}
