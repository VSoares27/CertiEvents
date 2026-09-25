import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// Define o tipo para o documento do Mongoose baseado na classe User
export type UserDocument = HydratedDocument<User>;

// Configura o schema do Mongoose ativando automaticamente os campos de data de criação e atualização (timestamps)
@Schema({ timestamps: true })
export class User {
  // Armazena o identificador único do usuário no AWS Cognito, sendo obrigatório e único
  @Prop({ required: true, unique: true })
  cognitoSub: string;

  // Armazena o nome completo do usuário, sendo um campo obrigatório
  @Prop({ required: true })
  fullName: string;

  // Armazena o e-mail do usuário, sendo obrigatório e único no sistema
  @Prop({ required: true, unique: true })
  email: string;

  // Define o nível de permissão/papel do usuário, aceitando apenas 'user' ou 'admin', com 'user' como padrão
  @Prop({ required: true, enum: ['user', 'admin'], default: 'user' })
  role: string;
}

// Cria e exporta o schema do Mongoose a partir da classe User
export const UserSchema = SchemaFactory.createForClass(User);