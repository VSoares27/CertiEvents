import { Controller, Get, Post, Body } from '@nestjs/common';
import { SpacesService } from './spaces.service.js';

// Controlador responsavel pelos endpoints de espacos e salas
@Controller('spaces')
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  // Lista todos os espacos cadastrados
  @Get()
  async findAll() {
    return this.spacesService.findAll();
  }

  // Cadastra um novo espaco com os dados recebidos na requisicao
  @Post()
  async create(@Body() body: { name: string }) {
    return this.spacesService.create({ name: body.name });
  }
}
