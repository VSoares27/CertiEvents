import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { Certificate, CertificateDocument } from './schemas/certificate.schema.js';
import { RequestCertificateDto } from './dto/request-certificate.dto.js';
import { PdfService } from './pdf/pdf.service.js';
import { LocalStorageService } from './storage/local-storage.service.js';

// Transforma a classe em um serviço injetável do NestJS responsável pela lógica de negócios dos certificados
@Injectable()
export class CertificatesService {
  // Injeta o modelo do Mongoose, o serviço de PDF e o serviço de armazenamento local via construtor
  constructor(
    @InjectModel(Certificate.name)
    private certificateModel: Model<CertificateDocument>,
    private pdfService: PdfService,
    private localStorageService: LocalStorageService,
  ) {}

  // Cria um novo registro de certificado no banco de dados com status pendente e dispara o processamento assíncrono
  async requestCertificate(dto: RequestCertificateDto) {
    const certificate = await this.certificateModel.create({
      userId: dto.userId,
      eventId: dto.eventId,
      registrationId: randomUUID(),
      status: 'pending',
    });

    const certificateId = (certificate._id as any).toString();

    // Simula uma fila SQS/Lambda executando o processamento do PDF em segundo plano
    this.processCertificate(
      certificateId,
      dto.fullName,
      dto.eventName,
      dto.eventDate,
    );

    // Retorna imediatamente o ID gerado e o status inicial do certificado
    return { id: certificateId, status: certificate.status };
  }

  // Método privado que executa a geração do PDF, salva o arquivo localmente e atualiza o status no banco
  private async processCertificate(
    id: string,
    fullName: string,
    eventName: string,
    eventDate: string,
  ) {
    try {
      // Chama o serviço de PDF passando os dados do evento e o ID do certificado
      const pdfBuffer = await this.pdfService.gerarCertificado(
        fullName,
        eventName,
        eventDate,
        id,
      );

      // Salva o buffer do PDF gerado no armazenamento local
      this.localStorageService.saveCertificate(id, pdfBuffer);

      // Atualiza o status do certificado no banco de dados para 'ready' e define a data de conclusão
      await this.certificateModel.findByIdAndUpdate(id, {
        status: 'ready',
        s3Key: id,
        readyAt: new Date(),
      });
    } catch (error) {
      // Em caso de erro, altera o status do certificado para 'failed' e registra o erro no console
      await this.certificateModel.findByIdAndUpdate(id, { status: 'failed' });
      console.error('Erro ao gerar certificado:', error);
    }
  }

  // Busca e retorna os dados de um certificado pelo ID, lançando uma exceção se ele não existir
  async getStatus(id: string) {
    const certificate = await this.certificateModel.findById(id);
    if (!certificate) {
      throw new NotFoundException('Certificado não encontrado.');
    }
    return certificate;
  }
}