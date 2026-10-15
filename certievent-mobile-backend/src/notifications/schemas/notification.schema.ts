import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// Define o tipo para o documento do Mongoose baseado na classe Notification
export type NotificationDocument = HydratedDocument<Notification>;

// Schema para armazenar as notificacoes enviadas aos usuarios
@Schema({ timestamps: true })
export class Notification {
  // ID do usuario destinatario da notificacao
  @Prop({ type: String, required: true })
  userId: string;

  // Tipo da notificacao
  @Prop({ type: String, enum: ['participation_approved', 'certificate_ready', 'registration_rejected'], required: true })
  type: string;

  // Mensagem descritiva da notificacao
  @Prop({ type: String, required: true })
  message: string;

  // ID do evento relacionado a notificacao (opcional)
  @Prop({ type: String })
  eventId?: string;

  // Indica se a notificacao foi lida pelo usuario
  @Prop({ type: Boolean, default: false })
  read: boolean;
}

// Cria e exporta o schema do Mongoose a partir da classe Notification
export const NotificationSchema = SchemaFactory.createForClass(Notification);
