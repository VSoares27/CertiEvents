import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { User, UserSchema } from './schemas/user.schema.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard.js';
import { AdminGuard } from './guards/admin.guard.js';

// Modulo responsavel pelas funcionalidades de autenticacao de usuarios
@Module({
  // Importa modulos necessarios: Mongoose para persistencia de User e JwtModule com chave do .env
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  // Registra o controlador com as rotas de autenticacao
  controllers: [AuthController],
  // Registra o servico e os guards responsaveis pelas operacoes de autenticacao e autorizacao
  providers: [AuthService, JwtAuthGuard, OptionalJwtAuthGuard, AdminGuard],
  // Exporta MongooseModule, JwtModule, AuthService e os guards para uso em outros modulos
  exports: [MongooseModule, JwtModule, AuthService, JwtAuthGuard, OptionalJwtAuthGuard, AdminGuard],
})
export class AuthModule {}
