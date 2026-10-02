import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CertificatesModule } from '../certificates/certificates.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

// Modulo administrativo que agrupa as rotas e servicos de gestao de inscricoes
@Module({
  imports: [EventsModule, AuthModule, CertificatesModule, NotificationsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
