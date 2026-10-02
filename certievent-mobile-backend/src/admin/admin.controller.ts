import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Query,
  Param,
  Body,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AdminService } from './admin.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';

// Controlador das rotas administrativas de inscricoes, protegido por JWT e pelo guard de administrador
@Controller('admin/registrations')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Retorna a lista de inscricoes com dados de usuario e evento, com filtros opcionais por evento e nome
  @Get()
  listRegistrations(
    @Query('eventId') eventId?: string,
    @Query('participantName') name?: string,
  ) {
    return this.adminService.listRegistrations(eventId, name);
  }

  // Aprova uma inscricao pelo ID e notifica o participante
  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.adminService.approve(id);
  }

  // Rejeita uma inscricao pelo ID
  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.adminService.reject(id);
  }

  // Remove uma inscricao pelo ID
  @Delete(':id')
  deleteReg(@Param('id') id: string) {
    return this.adminService.deleteReg(id);
  }

  // Solicita certificados em lote para os IDs de inscricao fornecidos no corpo da requisicao
  @Post('send-certificates')
  sendCertificates(@Body() body: { registrationIds: string[] }) {
    return this.adminService.sendCertificates(body.registrationIds);
  }

  // Gera e retorna um PDF com o relatorio de inscricoes como anexo para download
  @Get('export-pdf')
  async exportPdf(
    @Query('eventId') eventId?: string,
    @Query('participantName') name?: string,
    @Res() res?: Response,
  ) {
    const buffer = await this.adminService.exportPdf(eventId, name);
    res!
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=relatorio.pdf',
        'Content-Length': buffer.length,
      })
      .end(buffer);
  }
}
