import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CategoriesService } from './categories.service.js';

// Controlador responsavel pelos endpoints de categorias
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // Cadastra uma nova categoria no sistema
  @Post()
  create(@Body() createCategoryDto: Record<string, unknown>) {
    return this.categoriesService.create(createCategoryDto);
  }

  // Lista todas as categorias cadastradas
  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  // Busca uma categoria específica pelo seu identificador único
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  // Atualiza os dados de uma categoria existente
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: Record<string, unknown>,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  // Remove uma categoria pelo seu identificador único
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
