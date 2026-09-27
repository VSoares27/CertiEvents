import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

// Define o tipo para o documento do Mongoose baseado na classe Space
export type SpaceDocument = HydratedDocument<Space>;

// Configura o schema do Mongoose ativando automaticamente os timestamps de criacao e atualizacao
@Schema({ timestamps: true })
export class Space {
  // Nome do espaco ou sala, sendo um campo obrigatorio
  @Prop({ required: true })
  name: string;

  // Descricao detalhada do espaco
  @Prop()
  description?: string;

  // Endereco fisico do local
  @Prop()
  address?: string;

  // Cidade onde o espaco esta situado
  @Prop()
  city?: string;

  // Estado ou UF onde o espaco esta situado
  @Prop()
  state?: string;

  // Capacidade maxima de pessoas comportadas pelo espaco
  @Prop()
  capacity?: number;

  // URL ou caminho do arquivo da foto do espaco
  @Prop()
  imageUrl?: string;

  // Referencia ao usuario proprietario ou responsavel pelo espaco
  @Prop({ type: Types.ObjectId, ref: 'User' })
  ownerId?: Types.ObjectId;

  // Status de disponibilidade do espaco, ativo por padrao
  @Prop({ default: true })
  active: boolean;
}

// Cria e exporta o schema do Mongoose a partir da classe Space
export const SpaceSchema = SchemaFactory.createForClass(Space);
