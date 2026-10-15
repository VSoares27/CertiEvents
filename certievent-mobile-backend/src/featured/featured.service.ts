import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Featured, FeaturedDocument } from './schemas/featured.schema.js';

@Injectable()
export class FeaturedService {
  constructor(
    @InjectModel(Featured.name)
    private readonly featuredModel: Model<FeaturedDocument>,
  ) {}

  // Retorna o unico documento de destaque (ou null se nunca foi criado)
  async get(): Promise<FeaturedDocument | null> {
    return this.featuredModel.findOne().sort({ updatedAt: -1 }).exec();
  }

  // Cria ou atualiza o unico documento de destaque
  async upsert(data: Partial<Featured>): Promise<FeaturedDocument> {
    const existing = await this.featuredModel.findOne().exec();
    if (existing) {
      Object.assign(existing, data);
      return existing.save();
    }
    return this.featuredModel.create(data);
  }
}
