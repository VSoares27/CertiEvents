import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// Define o tipo para o documento do Mongoose baseado na classe Event
export type EventDocument = HydratedDocument<Event>;

// Configura o schema do Mongoose ativando automaticamente os campos de data de criação e atualização (timestamps)
@Schema({ timestamps: true })
export class Event {
  // Armazena o nome do evento, sendo um campo obrigatório
  @Prop({ required: true })
  name: string;

  // Armazena a descrição opcional do evento
  @Prop()
  description?: string;

  // Armazena a data e hora do evento, sendo um campo obrigatório
  @Prop({ required: true })
  date: Date;

  // Armazena o local opcional onde o evento ocorrerá
  @Prop()
  location?: string;

  // Armazena o ID do organizador, referenciando a collection 'User'
  @Prop({ type: String, ref: 'User' })
  organizerId: string;

  // Define o status do evento, aceitando valores específicos e definindo 'upcoming' como padrão
  @Prop({
    required: true,
    enum: ['upcoming', 'ongoing', 'finished'],
    default: 'upcoming',
  })
  status: string;
}

// Cria e exporta o schema do Mongoose a partir da classe Event
export const EventSchema = SchemaFactory.createForClass(Event);