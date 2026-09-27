import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Space, SpaceDocument } from './schemas/space.schema.js';

// Servico responsavel pelas operacoes de negocio e banco de dados para espacos
@Injectable()
export class SpacesService {
  constructor(
    @InjectModel(Space.name) private readonly spaceModel: Model<SpaceDocument>,
  ) {}

  // Cria e persiste um novo espaco no banco
  create(createSpaceDto: Partial<Space>) {
    const created = new this.spaceModel(createSpaceDto);
    return created.save();
  }

  // Retorna todos os espacos cadastrados
  findAll() {
    return this.spaceModel.find().exec();
  }

  // Busca um espaco por id, validando formato e existencia
  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Espaço ${id} não encontrado`);
    }
    const space = await this.spaceModel.findById(id).exec();
    if (!space) {
      throw new NotFoundException(`Espaço ${id} não encontrado`);
    }
    return space;
  }

  // Atualiza os dados de um espaco existente
  async update(id: string, updateSpaceDto: Partial<Space>) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Espaço ${id} não encontrado`);
    }
    const space = await this.spaceModel
      .findByIdAndUpdate(id, updateSpaceDto, { new: true })
      .exec();
    if (!space) {
      throw new NotFoundException(`Espaço ${id} não encontrado`);
    }
    return space;
  }

  // Exclui um espaco pelo id
  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Espaço ${id} não encontrado`);
    }
    const space = await this.spaceModel.findByIdAndDelete(id).exec();
    if (!space) {
      throw new NotFoundException(`Espaço ${id} não encontrado`);
    }
    return space;
  }
}
