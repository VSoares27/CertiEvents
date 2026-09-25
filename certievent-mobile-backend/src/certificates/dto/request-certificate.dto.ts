import { IsString, IsNotEmpty } from 'class-validator';

// Define a classe DTO para validar os dados de requisição de um certificado
export class RequestCertificateDto {
  // Valida que o ID do usuário é uma string e não está vazio, exibindo uma mensagem personalizada se falhar
  @IsString()
  @IsNotEmpty({ message: 'O userId é obrigatório.' })
  userId: string;

  // Valida que o ID do evento é uma string e não está vazio, exibindo uma mensagem personalizada se falhar
  @IsString()
  @IsNotEmpty({ message: 'O eventId é obrigatório.' })
  eventId: string;

  // Valida que o nome completo é uma string e não está vazio, exibindo uma mensagem personalizada se falhar
  @IsString()
  @IsNotEmpty({ message: 'O nome completo é obrigatório.' })
  fullName: string;

  // Valida que o nome do evento é uma string e não está vazio, exibindo uma mensagem personalizada se falhar
  @IsString()
  @IsNotEmpty({ message: 'O nome do evento é obrigatório.' })
  eventName: string;

  // Valida que a data do evento é uma string e não está vazia, exibindo uma mensagem personalizada se falhar
  @IsString()
  @IsNotEmpty({ message: 'A data do evento é obrigatória.' })
  eventDate: string;
}