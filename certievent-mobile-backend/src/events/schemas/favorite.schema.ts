import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// Define o tipo para o documento do Mongoose baseado na classe Favorite
export type FavoriteDocument = HydratedDocument<Favorite>;

// Schema para armazenar os eventos favoritos de cada usuario
@Schema({ timestamps: true })
export class Favorite {
  // ID do usuario que favoritou o evento
  @Prop({ type: String, required: true })
  userId: string;

  // ID do evento favoritado
  @Prop({ type: String, required: true })
  eventId: string;
}

// Cria e exporta o schema do Mongoose a partir da classe Favorite
export const FavoriteSchema = SchemaFactory.createForClass(Favorite);
