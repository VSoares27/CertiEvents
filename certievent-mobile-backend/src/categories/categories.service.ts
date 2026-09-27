import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema.js';

// Servico responsavel pelas operacoes de negocio e banco de dados para categorias
@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  // Cria e persiste uma nova categoria no banco
  create(createCategoryDto: Partial<Category>) {
    const created = new this.categoryModel(createCategoryDto);
    return created.save();
  }

  // Retorna todas as categorias cadastradas
  findAll() {
    return this.categoryModel.find().exec();
  }

  // Busca uma categoria por id, validando o formato e existencia
  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Categoria ${id} não encontrada`);
    }
    const category = await this.categoryModel.findById(id).exec();
    if (!category) {
      throw new NotFoundException(`Categoria ${id} não encontrada`);
    }
    return category;
  }

  // Atualiza os dados de uma categoria com base no id fornecido
  async update(id: string, updateCategoryDto: Partial<Category>) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Categoria ${id} não encontrada`);
    }
    const category = await this.categoryModel
      .findByIdAndUpdate(id, updateCategoryDto, { new: true })
      .exec();
    if (!category) {
      throw new NotFoundException(`Categoria ${id} não encontrada`);
    }
    return category;
  }

  // Exclui uma categoria do banco de dados pelo id
  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Categoria ${id} não encontrada`);
    }
    const category = await this.categoryModel.findByIdAndDelete(id).exec();
    if (!category) {
      throw new NotFoundException(`Categoria ${id} não encontrada`);
    }
    return category;
  }
}
