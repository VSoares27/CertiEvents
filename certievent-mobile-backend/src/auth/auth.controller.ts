import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AuthService } from './auth.service.js';
import { CadastroDto } from './dto/cadastro.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

const avatarUploadDir = join(process.cwd(), 'storage', 'uploads');
if (!existsSync(avatarUploadDir)) {
  mkdirSync(avatarUploadDir, { recursive: true });
}

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

  // Endpoint para upload do avatar do usuário autenticado
  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: avatarUploadDir,
        filename: (req: any, file, cb) => {
          const userId = req.user?.userId || req.user?.sub || 'unknown';
          const ext = extname(file.originalname) || '.jpg';
          cb(null, `avatar-${userId}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Apenas imagens são aceitas.'), false);
      },
    }),
  )
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    const userId = req.user?.userId || req.user?.sub;
    const avatarUrl = file.filename;
    await this.authService.updateAvatar(userId, avatarUrl);
    return { avatarUrl };
  }
}

