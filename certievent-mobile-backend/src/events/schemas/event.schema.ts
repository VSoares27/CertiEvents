import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

// Define o tipo para o documento do Mongoose baseado na classe Event
export type EventDocument = HydratedDocument<Event>;

// Configura o schema do Mongoose ativando automaticamente os timestamps de criacao e atualizacao
@Schema({ timestamps: true })
export class Event {
  // Nome ou titulo do evento, sendo um campo obrigatorio
  @Prop({ required: true })
  name: string;

  // Descricao detalhada do evento
  @Prop()
  description?: string;

  // Data e horario programados para a realizacao do evento
  @Prop({ required: true })
  date: Date;

  // Local ou instituicao onde o evento ocorrera
  @Prop()
  location?: string;

  // Referencia ao usuario responsavel pela organizacao do evento
  @Prop({ type: Types.ObjectId, ref: 'User' })
  organizerId?: Types.ObjectId;

  // Referencia a categoria a qual o evento pertence
  @Prop({ type: Types.ObjectId, ref: 'Category' })
  categoryId?: Types.ObjectId;

  // Referencia ao espaco ou sala onde o evento sera realizado
  @Prop({ type: Types.ObjectId, ref: 'Space' })
  spaceId?: Types.ObjectId;

  // Modalidade de realizacao do evento, podendo ser presencial ou online
  @Prop({
    enum: ['presencial', 'online'],
    default: 'presencial',
  })
  type: string;

  // Nome do arquivo da imagem de capa salva no servidor
  @Prop()
  imageUrl?: string;

  // Status atual do evento, podendo ser upcoming, ongoing ou finished
  @Prop({
    required: true,
    enum: ['upcoming', 'ongoing', 'finished'],
    default: 'upcoming',
  })
  status: string;
}

// Cria e exporta o schema do Mongoose a partir da classe Event
export const EventSchema = SchemaFactory.createForClass(Event);