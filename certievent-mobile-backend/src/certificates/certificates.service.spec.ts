import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CertificatesService } from './certificates.service.js';
import { Certificate } from './schemas/certificate.schema.js';
import { PdfService } from './pdf/pdf.service.js';
import { LocalStorageService } from './storage/local-storage.service.js';

// Mock do Model de certificado com os métodos usados pelo CertificatesService
const mockCertificateModel = () => ({
  create: vi.fn().mockResolvedValue({ _id: 'mock-id', status: 'pending' }),
  findById: vi.fn().mockReturnThis(),
  findByIdAndUpdate: vi.fn().mockResolvedValue({}),
  exec: vi.fn().mockResolvedValue(null),
});

describe('CertificatesService', () => {
  let service: CertificatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificatesService,
        { provide: getModelToken(Certificate.name), useFactory: mockCertificateModel },
        { provide: PdfService, useValue: { gerarCertificado: vi.fn().mockResolvedValue(Buffer.from('')) } },
        { provide: LocalStorageService, useValue: { saveCertificate: vi.fn(), getCertificatePath: vi.fn(), exists: vi.fn() } },
      ],
    }).compile();

    service = module.get<CertificatesService>(CertificatesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
