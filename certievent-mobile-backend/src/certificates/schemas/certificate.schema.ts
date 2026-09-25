import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// Define o tipo para o documento do Mongoose baseado na classe Certificate
export type CertificateDocument = HydratedDocument<Certificate>;

// Configura o schema do Mongoose ativando automaticamente os campos de data de criação e atualização (timestamps)
@Schema({ timestamps: true })
export class Certificate {
  // Armazena o ID do usuário associado, referenciando a collection 'User' e sendo obrigatório
  @Prop({ type: String, ref: 'User', required: true })
  userId: string;

  // Armazena o ID do evento associado, referenciando a collection 'Event' e sendo obrigatório
  @Prop({ type: String, ref: 'Event', required: true })
  eventId: string;

  // Armazena o ID da inscrição associada, referenciando a collection 'Registration' e sendo obrigatório
  @Prop({ type: String, ref: 'Registration', required: true })
  registrationId: string;

  // Controla o status do certificado, permitindo apenas valores específicos e definindo 'pending' como padrão
  @Prop({
    required: true,
    enum: ['pending', 'processing', 'ready', 'failed'],
    default: 'pending',
  })
  status: string;

  // Armazena o caminho ou chave opcional do arquivo armazenado no S3
  @Prop()
  s3Key?: string;

  // Armazena a data e hora opcionais em que o certificado ficou pronto
  @Prop()
  readyAt?: Date;

  // Armazena a data e hora opcionais em que o certificado foi enviado
  @Prop()
  sentAt?: Date;
}

// Cria e exporta o schema do Mongoose a partir da classe decorada
export const CertificateSchema = SchemaFactory.createForClass(Certificate);