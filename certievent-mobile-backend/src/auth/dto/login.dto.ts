import { IsEmail, IsString } from 'class-validator';

// DTO com as credenciais de acesso para autenticacao do usuario
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
