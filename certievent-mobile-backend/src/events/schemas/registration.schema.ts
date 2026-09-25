import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// Define o tipo para o documento do Mongoose baseado na classe Registration
export type RegistrationDocument = HydratedDocument<Registration>;

// Configura o schema do Mongoose ativando automaticamente os campos de data de criação e atualização (timestamps)
@Schema({ timestamps: true })
export class Registration {
  // Armazena o ID do usuário cadastrado, referenciando a collection 'User' e sendo obrigatório
  @Prop({ type: String, ref: 'User', required: true })
  userId: string;

  // Armazena o ID do evento correspondente, referenciando a collection 'Event' e sendo obrigatório
  @Prop({ type: String, ref: 'Event', required: true })
  eventId: string;

  // Indica se o usuário compareceu ao evento, definindo 'false' como padrão
  @Prop({ default: false })
  attended: boolean;

  // Armazena a data e hora opcionais em que foi realizado o check-in do participante
  @Prop()
  checkedInAt?: Date;
}

// Cria e exporta o schema do Mongoose a partir da classe Registration
export const RegistrationSchema = SchemaFactory.createForClass(Registration);