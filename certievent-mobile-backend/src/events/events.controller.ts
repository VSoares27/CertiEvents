import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Types } from 'mongoose';
import { EventsService } from './events.service.js';

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

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const event = await this.eventsService.findOne(id);
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
    });

    return newEvent;
  }
}
