import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { RolesGuard } from '../common/roles.guard'
import { CategoriasController, ProdutosController } from './catalogo.controller'
import { CategoriasService } from './categorias.service'
import { ProdutosService } from './produtos.service'

@Module({
  imports: [AuthModule],
  controllers: [CategoriasController, ProdutosController],
  providers: [CategoriasService, ProdutosService, RolesGuard],
})
export class CatalogoModule {}
