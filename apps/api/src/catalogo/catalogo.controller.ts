import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common'
import {
  type CreateCategoriaInput,
  type CreateProdutoInput,
  type ImportProdutosInput,
  type JwtClaims,
  createCategoriaSchema,
  createProdutoSchema,
  importProdutosSchema,
} from '@pdv-udv/shared'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../common/roles.decorator'
import { RolesGuard } from '../common/roles.guard'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { CategoriasService } from './categorias.service'
import { ProdutosService } from './produtos.service'

function nucleoOf(user: JwtClaims): string {
  if (!user.nucleoId) throw new BadRequestException('Usuário sem núcleo associado')
  return user.nucleoId
}

@Controller('categorias')
@UseGuards(JwtAuthGuard)
export class CategoriasController {
  constructor(private readonly categorias: CategoriasService) {}

  @Post()
  create(
    @CurrentUser() user: JwtClaims,
    @Body(new ZodValidationPipe(createCategoriaSchema)) body: CreateCategoriaInput,
  ) {
    return this.categorias.create(nucleoOf(user), body)
  }

  @Get()
  list(@CurrentUser() user: JwtClaims) {
    return this.categorias.list(nucleoOf(user))
  }
}

@Controller('produtos')
@UseGuards(JwtAuthGuard)
export class ProdutosController {
  constructor(private readonly produtos: ProdutosService) {}

  @Post()
  create(
    @CurrentUser() user: JwtClaims,
    @Body(new ZodValidationPipe(createProdutoSchema)) body: CreateProdutoInput,
  ) {
    return this.produtos.create(nucleoOf(user), body)
  }

  @Get()
  list(@CurrentUser() user: JwtClaims, @Query('categoriaId') categoriaId?: string) {
    return this.produtos.list(nucleoOf(user), categoriaId)
  }

  @Post('import')
  @UseGuards(RolesGuard)
  @Roles('responsavel_emporio', 'admin')
  importar(
    @CurrentUser() user: JwtClaims,
    @Body(new ZodValidationPipe(importProdutosSchema)) body: ImportProdutosInput,
  ) {
    return this.produtos.importar(nucleoOf(user), body)
  }
}
