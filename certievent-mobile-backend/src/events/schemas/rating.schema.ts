import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// Define o tipo para o documento do Mongoose baseado na classe Rating
export type RatingDocument = HydratedDocument<Rating>;

// Schema para armazenar as avaliações dos usuários nos eventos
@Schema({ timestamps: true })
export class Rating {
  // ID do usuario que realizou a avaliacao
  @Prop({ type: String, required: true })
  userId: string;

  // ID do evento avaliado
  @Prop({ type: String, required: true })
  eventId: string;

  // Numero de estrelas da avaliacao (1 a 5)
  @Prop({ type: Number, required: true, min: 1, max: 5 })
  stars: number;
}

// Cria e exporta o schema do Mongoose a partir da classe Rating
export const RatingSchema = SchemaFactory.createForClass(Rating);
