import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SpacesController } from './spaces.controller.js';
import { SpacesService } from './spaces.service.js';
import { Space, SpaceSchema } from './schemas/space.schema.js';

// Modulo responsavel pelo gerenciamento de espacos fisicos e salas
@Module({
  imports: [
    // Registra o schema de Space no Mongoose para injecao no servico
    MongooseModule.forFeature([
      { name: Space.name, schema: SpaceSchema },
    ]),
  ],
  controllers: [SpacesController],
  providers: [SpacesService],
  exports: [SpacesService, MongooseModule],
})
export class SpacesModule {}
