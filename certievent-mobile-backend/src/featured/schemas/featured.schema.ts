import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FeaturedDocument = HydratedDocument<Featured>;

// Banner de destaque editavel pelo admin — independente dos eventos
@Schema({ timestamps: true, collection: 'featured' })
export class Featured {
  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  subtitle: string;

  @Prop({ type: Date, default: null })
  date: Date | null;

  @Prop({ type: Date, default: null })
  endDate: Date | null;

  @Prop({ default: '' })
  location: string;

  @Prop({ default: '' })
  imageUrl: string;
}

export const FeaturedSchema = SchemaFactory.createForClass(Featured);
