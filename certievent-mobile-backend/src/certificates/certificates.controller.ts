import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Res,
  NotFoundException,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Response } from 'express';
import { CertificatesService } from './certificates.service.js';
import { RequestCertificateDto } from './dto/request-certificate.dto.js';
import { LocalStorageService } from './storage/local-storage.service.js';
import { PdfService } from './pdf/pdf.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('certificates')
export class CertificatesController {
  constructor(
    private readonly certificatesService: CertificatesService,
    private readonly localStorageService: LocalStorageService,
    private readonly pdfService: PdfService,
  ) {}

  @Post('request')
  requestCertificate(@Body() dto: RequestCertificateDto) {
    return this.certificatesService.requestCertificate(dto);
  }

  // Gera uma prévia instantânea em imagem Base64 (sem salvar no banco) para exibição imediata no app
  @Post('preview')
  async previewCertificate(@Body() body: any) {
    const buffer = await this.pdfService.gerarPreview(body, 'image');
    return {
      previewUrl: `data:image/jpeg;base64,${buffer.toString('base64')}`,
    };
  }

  // Gera uma prévia em stream de PDF sem persistir dados
  @Post('preview/pdf')
  async previewCertificatePdf(@Body() body: any, @Res() res: Response) {
    const buffer = await this.pdfService.gerarPreview(body, 'pdf');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
    return res.send(buffer);
  }

  // Rota autenticada para listar todos os certificados prontos do usuário logado
  @Get('user')
  @UseGuards(JwtAuthGuard)
  async getMyUserCertificates(@Req() req: any) {
    return this.certificatesService.getUserCertificates(req.user.sub);
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
