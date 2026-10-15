import { Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { NotificationsService } from './notifications.service.js';

// Controlador responsavel pelas rotas de notificacoes do usuario autenticado
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // Retorna todas as notificacoes do usuario autenticado com contagem de nao lidas
  @Get()
  async findForUser(@Req() req: any) {
    return this.notificationsService.findForUser(req.user.sub);
  }

  // Marca uma notificacao especifica como lida
  @Patch(':id/read')
  async markRead(@Param('id') id: string, @Req() req: any) {
    return this.notificationsService.markRead(id, req.user.sub);
  }
}
