import { IsEmail, IsString, MinLength } from 'class-validator';

// DTO com os dados necessarios para cadastrar um novo usuario
export class CadastroDto {
  @IsString()
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

