import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// Define o tipo para o documento do Mongoose baseado na classe Category
export type CategoryDocument = HydratedDocument<Category>;

// Configura o schema do Mongoose ativando automaticamente os timestamps de criacao e atualizacao
@Schema({ timestamps: true })
export class Category {
  // Nome da categoria, sendo unico e de preenchimento obrigatorio
  @Prop({ required: true, unique: true })
  name: string;

  // Descricao opcional para detalhar a categoria
  @Prop()
  description?: string;

  // Cor em formato hexadecimal para estilizacao na interface
  @Prop()
  color?: string;

  // Identificador do icone associado a categoria
  @Prop()
  icon?: string;

  // Indica se a categoria esta ativa para selecao, com padrao verdadeiro
  @Prop({ default: true })
  active: boolean;
}

// Cria e exporta o schema do Mongoose a partir da classe Category
export const CategorySchema = SchemaFactory.createForClass(Category);
