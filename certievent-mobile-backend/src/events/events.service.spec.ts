import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EventsService } from './events.service.js';
import { Event } from './schemas/event.schema.js';
import { Registration } from './schemas/registration.schema.js';
import { Rating } from './schemas/rating.schema.js';
import { Favorite } from './schemas/favorite.schema.js';

// Cria um mock genérico de Model do Mongoose com os métodos mais usados
const mockModel = () => ({
  find: vi.fn().mockReturnThis(),
  findOne: vi.fn().mockReturnThis(),
  findById: vi.fn().mockReturnThis(),
  findByIdAndUpdate: vi.fn().mockReturnThis(),
  findOneAndUpdate: vi.fn().mockReturnThis(),
  deleteOne: vi.fn().mockReturnThis(),
  create: vi.fn(),
  populate: vi.fn().mockReturnThis(),
  sort: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(null),
  save: vi.fn().mockResolvedValue({}),
});

describe('EventsService', () => {
  let service: EventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: getModelToken(Event.name), useFactory: mockModel },
        { provide: getModelToken(Registration.name), useFactory: mockModel },
        { provide: getModelToken(Rating.name), useFactory: mockModel },
        { provide: getModelToken(Favorite.name), useFactory: mockModel },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
