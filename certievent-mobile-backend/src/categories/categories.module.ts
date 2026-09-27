import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriesController } from './categories.controller.js';
import { CategoriesService } from './categories.service.js';
import { Category, CategorySchema } from './schemas/category.schema.js';

// Modulo responsavel pelo gerenciamento de categorias de eventos
@Module({
  imports: [
    // Registra o schema de Category no Mongoose para injecao no servico
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
    ]),
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService, MongooseModule],
})
export class CategoriesModule {}
