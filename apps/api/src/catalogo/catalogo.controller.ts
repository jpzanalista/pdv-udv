import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  type CreateCategoriaInput,
  type CreateProdutoInput,
  type EstoqueMovimentoInput,
  type ImportProdutosInput,
  type JwtClaims,
  type UpdateCategoriaInput,
  type UpdateProdutoInput,
  createCategoriaSchema,
  createProdutoSchema,
  estoqueMovimentoSchema,
  importProdutosSchema,
  updateCategoriaSchema,
  updateProdutoSchema,
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

  @Get()
  list(@CurrentUser() user: JwtClaims) {
    return this.categorias.list(nucleoOf(user))
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('responsavel_emporio', 'admin')
  create(
    @CurrentUser() user: JwtClaims,
    @Body(new ZodValidationPipe(createCategoriaSchema)) body: CreateCategoriaInput,
  ) {
    return this.categorias.create(nucleoOf(user), body)
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('responsavel_emporio', 'admin')
  atualizar(
    @CurrentUser() user: JwtClaims,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCategoriaSchema)) body: UpdateCategoriaInput,
  ) {
    return this.categorias.atualizar(nucleoOf(user), id, body)
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('responsavel_emporio', 'admin')
  excluir(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.categorias.excluir(nucleoOf(user), id)
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

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('responsavel_emporio', 'admin')
  atualizar(
    @CurrentUser() user: JwtClaims,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProdutoSchema)) body: UpdateProdutoInput,
  ) {
    return this.produtos.atualizar(nucleoOf(user), id, body)
  }

  @Post(':id/estoque')
  @UseGuards(RolesGuard)
  @Roles('responsavel_emporio', 'admin')
  movimentarEstoque(
    @CurrentUser() user: JwtClaims,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(estoqueMovimentoSchema)) body: EstoqueMovimentoInput,
  ) {
    return this.produtos.movimentarEstoque(nucleoOf(user), id, body)
  }

  @Get(':id/estoque')
  @UseGuards(RolesGuard)
  @Roles('responsavel_emporio', 'admin')
  historicoEstoque(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.produtos.historicoEstoque(nucleoOf(user), id)
  }
}
