import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { FeaturedService } from './featured.service.js';

const uploadDir = join(process.cwd(), 'storage', 'uploads');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

@Controller('featured')
export class FeaturedController {
  constructor(private readonly featuredService: FeaturedService) {}

  // Retorna o destaque atual (publico)
  @Get()
  async get() {
    const featured = await this.featuredService.get();
    return featured ?? null;
  }

  // Salva/atualiza o destaque (ideal gated por admin — aqui sem guard por simplicidade,
  // pode ser protegido com AdminGuard futuramente)
  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: uploadDir,
        filename: (_req, file, cb) => {
          const safe = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
          cb(null, safe);
        },
      }),
    }),
  )
  async upsert(
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const payload: any = {
      title: body.title ?? '',
      subtitle: body.subtitle ?? '',
      location: body.location ?? '',
      date: body.date ? new Date(body.date) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
    };
    if (file) {
      payload.imageUrl = file.filename;
    } else if (body.imageUrl !== undefined) {
      payload.imageUrl = body.imageUrl;
    }
    return this.featuredService.upsert(payload);
  }
}
