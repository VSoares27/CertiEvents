import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Registration, RegistrationDocument } from '../events/schemas/registration.schema.js';
import { Event, EventDocument } from '../events/schemas/event.schema.js';
import { User, UserDocument } from '../auth/schemas/user.schema.js';
import { CertificatesService } from '../certificates/certificates.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PdfService } from '../certificates/pdf/pdf.service.js';

// Servico responsavel pela logica de negocio das rotas administrativas de inscricoes
@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Registration.name)
    private readonly registrationModel: Model<RegistrationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Event.name)
    private readonly eventModel: Model<EventDocument>,
    private readonly certificatesService: CertificatesService,
    private readonly notificationsService: NotificationsService,
    private readonly pdfService: PdfService,
  ) {}

  // Lista inscricoes com dados enriquecidos de usuario e evento, com filtros opcionais
  async listRegistrations(eventId?: string, participantName?: string) {
    const filter: Record<string, unknown> = {};

    if (participantName) {
      // Busca usuarios cujo nome coincida com o filtro e coleta seus IDs como strings
      const matchingUsers = await this.userModel
        .find({ fullName: { $regex: participantName, $options: 'i' } }, { _id: 1 })
        .exec();
      const userIds = matchingUsers.map((u) => (u._id as Types.ObjectId).toString());
      filter['userId'] = { $in: userIds };
    }

    if (eventId) {
      filter['eventId'] = eventId;
    }

    const registrations = await this.registrationModel.find(filter).exec();

    // Coleta IDs unicos de usuarios e eventos para busca em lote
    const uniqueUserIds = [...new Set(registrations.map((r) => r.userId))];
    const uniqueEventIds = [...new Set(registrations.map((r) => r.eventId))];

    // Busca em lote convertendo strings para ObjectId conforme necessario
    const users = await this.userModel
      .find({ _id: { $in: uniqueUserIds.map((id) => new Types.ObjectId(id)) } })
      .exec();
    const events = await this.eventModel
      .find({ _id: { $in: uniqueEventIds.map((id) => new Types.ObjectId(id)) } })
      .exec();

    // Constroi mapas indexados pelo ID string para lookup O(1)
    const userMap = new Map<string, UserDocument>(
      users.map((u) => [(u._id as Types.ObjectId).toString(), u]),
    );
    const eventMap = new Map<string, EventDocument>(
      events.map((e) => [(e._id as Types.ObjectId).toString(), e]),
    );

    return registrations.map((reg) => {
      const u = userMap.get(reg.userId);
      const e = eventMap.get(reg.eventId);
      return {
        ...reg.toObject(),
        user: u ? { name: u.fullName, email: u.email } : null,
        event: e ? { _id: (e._id as Types.ObjectId).toString(), name: e.name, date: e.date } : null,
      };
    });
  }

  // Aprova uma inscricao e envia notificacao ao participante
  async approve(id: string) {
    // Busca a inscricao antes de atualizar para verificar seu status atual
    const existingReg = await this.registrationModel.findById(id).exec();
    
    if (!existingReg) {
      throw new NotFoundException('Inscrição não encontrada.');
    }

    // Valida se a inscricao ainda pode ser processada
    if (existingReg.status !== 'pending') {
      throw new Error(`Inscrição já foi processada com status: ${existingReg.status}`);
    }

    const reg = await this.registrationModel
      .findByIdAndUpdate(id, { status: 'approved' }, { returnDocument: 'after' })
      .exec();

    if (!reg) {
      throw new NotFoundException('Inscrição não encontrada.');
    }

    const event = await this.eventModel.findById(new Types.ObjectId(reg.eventId)).exec();

    try {
      await this.notificationsService.createNotification({
        userId: reg.userId,
        type: 'participation_approved',
        message: `Você está participando do evento ${event?.name ?? reg.eventId}`,
        eventId: reg.eventId,
      });
    } catch (error) {
      // Rollback: reverte o status da inscricao se a notificacao falhar
      await this.registrationModel
        .findByIdAndUpdate(id, { status: 'pending' })
        .exec();
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Falha ao enviar notificação: ${errorMessage}`);
    }

    return reg;
  }

  // Rejeita uma inscricao e envia notificacao ao participante
  async reject(id: string) {
    // Busca a inscricao antes de atualizar para verificar seu status atual
    const existingReg = await this.registrationModel.findById(id).exec();
    
    if (!existingReg) {
      throw new NotFoundException('Inscrição não encontrada.');
    }

    // Valida se a inscricao ainda pode ser processada
    if (existingReg.status !== 'pending') {
      throw new Error(`Inscrição já foi processada com status: ${existingReg.status}`);
    }

    const reg = await this.registrationModel
      .findByIdAndUpdate(id, { status: 'rejected' }, { returnDocument: 'after' })
      .exec();

    if (!reg) {
      throw new NotFoundException('Inscrição não encontrada.');
    }

    const event = await this.eventModel.findById(new Types.ObjectId(reg.eventId)).exec();

    try {
      await this.notificationsService.createNotification({
        userId: reg.userId,
        type: 'registration_rejected',
        message: `Sua solicitação de participação no evento ${event?.name ?? reg.eventId} não foi aprovada`,
        eventId: reg.eventId,
      });
    } catch (error) {
      // Rollback: reverte o status da inscricao se a notificacao falhar
      await this.registrationModel
        .findByIdAndUpdate(id, { status: 'pending' })
        .exec();
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Falha ao enviar notificação: ${errorMessage}`);
    }

    return reg;
  }

  // Remove uma inscricao pelo ID
  async deleteReg(id: string) {
    const deleted = await this.registrationModel.findByIdAndDelete(id).exec();

    if (!deleted) {
      throw new NotFoundException('Inscrição não encontrada.');
    }

    return deleted;
  }

  // Solicita certificados em lote e envia notificacoes aos participantes aprovados
  async sendCertificates(registrationIds: string[]) {
    const success: string[] = [];
    const failed: string[] = [];
    const errors: string[] = [];

    for (const id of registrationIds) {
      try {
        const reg = await this.registrationModel.findById(id).exec();
        if (!reg) {
          failed.push(id);
          errors.push(`Inscrição ${id} não encontrada.`);
          continue;
        }

        const user = await this.userModel
          .findById(new Types.ObjectId(reg.userId))
          .exec();
        const event = await this.eventModel
          .findById(new Types.ObjectId(reg.eventId))
          .exec();

        if (!user || !event) {
          failed.push(id);
          errors.push(`Usuário ou evento não encontrado para inscrição ${id}.`);
          continue;
        }

        const cert = await this.certificatesService.requestCertificate({
          userId: reg.userId,
          eventId: reg.eventId,
          fullName: user.fullName,
          eventName: event.name,
          eventDate: event.date.toISOString(),
        });
        await this.registrationModel.findByIdAndUpdate(id, {
          certificateIssued: true,
          certificateDocId: cert.id,
        });

        await this.notificationsService.createNotification({
          userId: reg.userId,
          type: 'certificate_ready',
          message: 'Seu certificado foi aceito e está pronto para baixar',
          eventId: reg.eventId,
        });

        success.push(id);
      } catch (err) {
        failed.push(id);
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }

    return { success, failed, errors };
  }

  // Gera um PDF com o relatorio de inscricoes filtrado pelos parametros fornecidos
  async exportPdf(eventId?: string, participantName?: string): Promise<Buffer> {
    const registrations = await this.listRegistrations(eventId, participantName);

    const items = registrations.map((item) => ({
      name: item.user?.name ?? '',
      event: item.event?.name ?? '',
      status: item.status as string,
      date: item.event?.date
        ? new Date(item.event.date).toLocaleDateString('pt-BR')
        : '',
    }));

    return this.pdfService.gerarRelatorio(items);
  }
}
