import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { CategoriasController, ProdutosController } from './catalogo.controller'
import { CategoriasService } from './categorias.service'
import { ProdutosService } from './produtos.service'

@Module({
  imports: [AuthModule],
  controllers: [CategoriasController, ProdutosController],
  providers: [CategoriasService, ProdutosService],
})
export class CatalogoModule {}
