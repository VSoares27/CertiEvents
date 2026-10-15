import { Test, TestingModule } from '@nestjs/testing';
import { CertificatesController } from './certificates.controller.js';
import { CertificatesService } from './certificates.service.js';
import { LocalStorageService } from './storage/local-storage.service.js';

// Mock do CertificatesService com todos os métodos usados pelo controller
const mockCertificatesService = {
  requestCertificate: vi.fn(),
  getStatus: vi.fn(),
};

describe('CertificatesController', () => {
  let controller: CertificatesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CertificatesController],
      providers: [
        { provide: CertificatesService, useValue: mockCertificatesService },
        { provide: LocalStorageService, useValue: { saveCertificate: vi.fn(), getCertificatePath: vi.fn(), exists: vi.fn() } },
      ],
    }).compile();

    controller = module.get<CertificatesController>(CertificatesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
