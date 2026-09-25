import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Res,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { CertificatesService } from './certificates.service.js';
import { RequestCertificateDto } from './dto/request-certificate.dto.js';
import { LocalStorageService } from './storage/local-storage.service.js';

@Controller('certificates')
export class CertificatesController {
  constructor(
    private readonly certificatesService: CertificatesService,
    private readonly localStorageService: LocalStorageService,
  ) {}

  @Post('request')
  requestCertificate(@Body() dto: RequestCertificateDto) {
    return this.certificatesService.requestCertificate(dto);
  }

  @Get(':id')
  getStatus(@Param('id') id: string) {
    return this.certificatesService.getStatus(id);
  }

  @Get(':id/download')
  download(@Param('id') id: string, @Res() res: Response) {
    if (!this.localStorageService.exists(id)) {
      throw new NotFoundException('Certificado ainda não está pronto.');
    }
    return res.download(this.localStorageService.getCertificatePath(id));
  }
}