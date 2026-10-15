import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard.js';

// Mock do EventsService com todos os métodos usados pelo controller
const mockEventsService = {
  findAll: vi.fn(),
  findOne: vi.fn(),
  findOneWithUserData: vi.fn(),
  create: vi.fn(),
  participate: vi.fn(),
  requestCertificate: vi.fn(),
  rateEvent: vi.fn(),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
  getFavorites: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
};

describe('EventsController', () => {
  let controller: EventsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        { provide: EventsService, useValue: mockEventsService },
        { provide: JwtService, useValue: { verifyAsync: vi.fn() } },
        OptionalJwtAuthGuard,
      ],
    }).compile();

    controller = module.get<EventsController>(EventsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
