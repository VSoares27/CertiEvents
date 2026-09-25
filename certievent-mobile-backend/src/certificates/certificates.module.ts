import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CertificatesController } from './certificates.controller.js';
import { CertificatesService } from './certificates.service.js';
import { Certificate, CertificateSchema } from './schemas/certificate.schema.js';
import { PdfService } from './pdf/pdf.service.js';
import { LocalStorageService } from './storage/local-storage.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Certificate.name, schema: CertificateSchema },
    ]),
  ],
  controllers: [CertificatesController],
  providers: [CertificatesService, PdfService, LocalStorageService],
  exports: [MongooseModule],
})
export class CertificatesModule {}