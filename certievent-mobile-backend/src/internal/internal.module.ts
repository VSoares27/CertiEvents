import { Module } from '@nestjs/common';
import { InternalController } from './internal.controller.js';
import { InternalService } from './internal.service.js';
import { CertificatesModule } from '../certificates/certificates.module.js';

@Module({
  imports: [CertificatesModule],
  controllers: [InternalController],
  providers: [InternalService],
})
export class InternalModule {}