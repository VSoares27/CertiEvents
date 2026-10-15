import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema.js';

interface CreateNotificationParams {
  userId: string;
  type: string;
  message: string;
  eventId?: string;
}

// Servico responsavel pelas operacoes de criacao, consulta e leitura de notificacoes
@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  // Cria uma nova notificacao para o usuario especificado
  async createNotification(params: CreateNotificationParams): Promise<NotificationDocument> {
    return this.notificationModel.create(params);
  }

  // Retorna todas as notificacoes de um usuario ordenadas por data de criacao (mais recentes primeiro)
  async findForUser(userId: string): Promise<{ notifications: NotificationDocument[]; unreadCount: number }> {
    const notifications = await this.notificationModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();

    const unreadCount = notifications.filter((n) => !n.read).length;

    return { notifications, unreadCount };
  }

  // Marca uma notificacao como lida, verificando se pertence ao usuario solicitante
  async markRead(id: string, userId: string): Promise<NotificationDocument | null> {
    const doc = await this.notificationModel.findById(id).exec();

    if (doc && doc.userId !== userId) {
      throw new ForbiddenException('Acesso negado a esta notificação.');
    }

    return this.notificationModel.findByIdAndUpdate(id, { read: true }, { returnDocument: 'after' }).exec();
  }
}
