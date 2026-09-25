import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { User, UserSchema } from './schemas/user.schema.js';

@Module({
  // Importa módulos necessários, registrando o Schema do Mongoose para o modelo User
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  // Registra os controladores que respondem pelas rotas HTTP deste módulo
  controllers: [AuthController],
  // Registra os serviços que contêm a lógica de negócios e podem ser injetados neste contexto
  providers: [AuthService],
  // Exporta o MongooseModule para que outros módulos que importarem o AuthModule possam usar o modelo User
  exports: [MongooseModule],
})
export class AuthModule {}