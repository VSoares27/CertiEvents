import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { CadastroDto } from './dto/cadastro.dto.js';
import { LoginDto } from './dto/login.dto.js';

// Controlador responsavel pelos endpoints publicos de autenticacao e registro
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Endpoint para verificacao de existencia de e-mail em tempo real
  @Get('check-email')
  async checkEmail(@Query('email') email: string) {
    return this.authService.checkEmail(email);
  }

  // Endpoint para cadastro de novo usuario na base local
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() cadastroDto: CadastroDto) {
    return this.authService.register(cadastroDto);
  }

  // Endpoint para login e emissao do token JWT
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}

