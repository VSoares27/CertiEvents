import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { User } from './schemas/user.schema.js';

// Mock do Model de usuário com os métodos usados pelo AuthService
const mockUserModel = () => ({
  findOne: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(null),
  save: vi.fn().mockResolvedValue({}),
});

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(User.name), useFactory: mockUserModel },
        { provide: JwtService, useValue: { signAsync: vi.fn().mockResolvedValue('token') } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
