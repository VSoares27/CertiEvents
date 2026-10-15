import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

// Mock do AuthService com todos os métodos usados pelo controller
const mockAuthService = {
  checkEmail: vi.fn(),
  register: vi.fn(),
  login: vi.fn(),
};

// Inicia o bloco de suíte de testes unitários para a classe AuthController
describe('AuthController', () => {
  let controller: AuthController;

  // Executado antes de cada teste, configurando o módulo de teste do NestJS e instanciando o controller
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  // Teste unitário básico que verifica se a instância do controller foi criada e definida com sucesso
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
