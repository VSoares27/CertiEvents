import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { User, UserSchema } from './schemas/user.schema.js';

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
  // Registra o servico responsavel pelas operacoes e regras de negocio de autenticacao
  providers: [AuthService],
  // Exporta MongooseModule e JwtModule para modulos que necessitarem validar usuarios ou tokens
  exports: [MongooseModule, JwtModule, AuthService],
})
export class AuthModule {}
