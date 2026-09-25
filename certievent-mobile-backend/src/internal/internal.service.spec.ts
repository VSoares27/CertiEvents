import { Test, TestingModule } from '@nestjs/testing';
import { InternalService } from './internal.service.js';

// Inicia o bloco de suíte de testes unitários para a classe InternalService
describe('InternalService', () => {
  let service: InternalService;

  // Executado antes de cada teste, configurando o módulo de teste do NestJS e instanciando o serviço
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InternalService],
    }).compile();

    service = module.get<InternalService>(InternalService);
  });

  // Teste unitário básico que verifica se a instância do serviço foi criada e definida com sucesso
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});