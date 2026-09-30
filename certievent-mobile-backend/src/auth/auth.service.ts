import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema.js';
import { CadastroDto } from './dto/cadastro.dto.js';
import { LoginDto } from './dto/login.dto.js';

// Lista de senhas comuns bloqueadas por politica de seguranca
const COMMON_PASSWORDS = [
  'senha123!',
  'password1!',
  'admin123!',
  'qwerty123!',
  '123456789',
  '12345678',
  'mudar123!',
  'teste123!',
  'master123!',
  'welcome123!',
  'brasil123!',
  'root123!',
  'padrao123!',
  'trocar123!',
];

// Servico responsavel pelas regras de negocio de cadastro e autenticacao
@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
  ) {}

  // Verifica se o endereco de e-mail ja esta em uso no banco
  async checkEmail(email: string): Promise<{ exists: boolean }> {
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      return { exists: false };
    }
    const user = await this.userModel.findOne({ email: normalizedEmail }).exec();
    return { exists: !!user };
  }

  // Realiza o cadastro de um novo usuario validando regras de senha e duplicidade
  async register(cadastroDto: CadastroDto): Promise<{ message: string }> {
    const { fullName, email, password } = cadastroDto;

    // Normaliza nome e e-mail
    const cleanFullName = (fullName || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanFullName || !cleanEmail || !password) {
      throw new BadRequestException('Preencha todos os campos obrigatórios.');
    }

    // Valida tamanho minimo de senha
    if (password.length < 6) {
      throw new BadRequestException('A senha deve ter pelo menos 6 caracteres.');
    }

    // Bloqueia senhas comuns
    if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
      throw new BadRequestException('Essa senha é muito comum, escolha outra.');
    }

    // Verifica duplicidade de e-mail
    const existingUser = await this.userModel.findOne({ email: cleanEmail }).exec();
    if (existingUser) {
      throw new ConflictException('E-mail já cadastrado.');
    }

    // Gera o hash criptografico da senha com custo 10
    const passwordHash = await bcrypt.hash(password, 10);

    // Cria e persiste o novo usuario
    const newUser = new this.userModel({
      fullName: cleanFullName,
      email: cleanEmail,
      passwordHash,
      role: 'user',
    });
    await newUser.save();

    return { message: 'Cadastro realizado com sucesso.' };
  }

  // Realiza a autenticacao do usuario comparando o hash e gerando o token JWT
  async login(loginDto: LoginDto): Promise<{ accessToken: string; fullName: string; email: string }> {
    const { email, password } = loginDto;
    const cleanEmail = (email || '').trim().toLowerCase();

    // Mensagem generica de credenciais invalidas para evitar enumeracao de contas
    const invalidCredentialsMessage = 'E-mail ou senha inválidos.';

    if (!cleanEmail || !password) {
      throw new UnauthorizedException(invalidCredentialsMessage);
    }

    // Busca o usuario pelo e-mail normalizado
    const user = await this.userModel.findOne({ email: cleanEmail }).exec();
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException(invalidCredentialsMessage);
    }

    // Compara a senha informada com o hash salvo no banco
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException(invalidCredentialsMessage);
    }

    // Gera o token de acesso JWT contendo sub e email no payload
    const payload = { sub: user._id.toString(), email: user.email };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      fullName: user.fullName,
      email: user.email,
    };
  }
}

