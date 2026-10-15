import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard.js';
import { EventsService } from './events.service.js';
import { RateEventDto } from './dto/rate-event.dto.js';

const uploadDir = join(process.cwd(), 'storage', 'uploads');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  async findAll() {
    return this.eventsService.findAll();
  }

  // Retorna os detalhes do evento; se o usuario estiver autenticado inclui dados de inscricao, avaliacao e favorito
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async findOne(@Param('id') id: string, @Req() req: any) {
    const event = await this.eventsService.findOneWithUserData(id, req.user?.sub);
    if (!event) {
      throw new NotFoundException(`Evento com id "${id}" não encontrado`);
    }
    return event;
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: uploadDir,
        filename: (_req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = extname(file.originalname) || '.jpg';
          cb(null, `event-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async create(
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const eventDate = body.date ? new Date(body.date) : new Date();

    const categoryId =
      body.categoryId && Types.ObjectId.isValid(body.categoryId)
        ? new Types.ObjectId(body.categoryId)
        : undefined;

    const spaceId =
      body.spaceId && Types.ObjectId.isValid(body.spaceId)
        ? new Types.ObjectId(body.spaceId)
        : undefined;

    const newEvent = await this.eventsService.create({
      name: body.name,
      description: body.description || '',
      date: eventDate,
      location: body.location || '',
      categoryId,
      spaceId,
      type: body.type || 'presencial',
      status: body.status || 'upcoming',
      imageUrl: file ? file.filename : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    });

    return newEvent;
  }

  // Inscreve o usuario autenticado no evento (idempotente)
  @Post(':id/participate')
  @UseGuards(JwtAuthGuard)
  async participate(@Param('id') id: string, @Req() req: any) {
    return this.eventsService.participate(id, req.user.sub);
  }

  // Solicita o certificado de participacao para o usuario autenticado
  @Post(':id/request-certificate')
  @UseGuards(JwtAuthGuard)
  async requestCertificate(@Param('id') id: string, @Req() req: any) {
    return this.eventsService.requestCertificate(id, req.user.sub);
  }

  // Cria ou atualiza a avaliacao do usuario para o evento (1 a 5 estrelas)
  @Post(':id/rate')
  @UseGuards(JwtAuthGuard)
  async rateEvent(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: RateEventDto,
  ) {
    return this.eventsService.rateEvent(id, req.user.sub, dto.stars);
  }

  // Adiciona o evento aos favoritos do usuario autenticado
  @Post(':id/favorite')
  @UseGuards(JwtAuthGuard)
  async addFavorite(@Param('id') id: string, @Req() req: any) {
    return this.eventsService.addFavorite(id, req.user.sub);
  }

  // Remove o evento dos favoritos do usuario autenticado
  @Delete(':id/favorite')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async removeFavorite(@Param('id') id: string, @Req() req: any) {
    await this.eventsService.removeFavorite(id, req.user.sub);
  }

  // Retorna todos os eventos favoritados pelo usuario autenticado
  @Get('me/favorites')
  @UseGuards(JwtAuthGuard)
  async getFavorites(@Req() req: any) {
    return this.eventsService.getFavorites(req.user.sub);
  }

  // Atualiza os dados de um evento existente
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.eventsService.updateEvent(id, body);
  }

  // Remove um evento pelo id
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.eventsService.deleteEvent(id);
  }
}
