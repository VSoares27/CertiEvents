import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from './schemas/event.schema.js';
import { Registration, RegistrationDocument } from './schemas/registration.schema.js';
import { Rating, RatingDocument } from './schemas/rating.schema.js';
import { Favorite, FavoriteDocument } from './schemas/favorite.schema.js';

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(Registration.name) private registrationModel: Model<RegistrationDocument>,
    @InjectModel(Rating.name) private ratingModel: Model<RatingDocument>,
    @InjectModel(Favorite.name) private favoriteModel: Model<FavoriteDocument>,
  ) {}

  async findAll(): Promise<EventDocument[]> {
    return this.eventModel
      .find()
      .populate('categoryId', 'name')
      .populate('spaceId', 'name')
      .sort({ date: 1 })
      .exec();
  }

  async findOne(id: string): Promise<EventDocument | null> {
    return this.eventModel
      .findById(id)
      .populate('categoryId', 'name')
      .populate('spaceId', 'name')
      .exec();
  }

  async create(data: Partial<Event>): Promise<EventDocument> {
    const event = new this.eventModel(data);
    const saved = await event.save();
    return this.findOne(saved._id.toString()) as Promise<EventDocument>;
  }

  // Registra o usuario no evento de forma idempotente (cria se nao existir)
  async participate(eventId: string, userId: string): Promise<RegistrationDocument> {
    const existing = await this.registrationModel.findOne({ userId, eventId }).exec();
    if (existing) {
      return existing;
    }
    return this.registrationModel.create({
      userId,
      eventId,
      status: 'pending',
      attended: false,
      certificateRequested: false,
    });
  }

  // Marca a inscricao do usuario como solicitante de certificado
  async requestCertificate(eventId: string, userId: string): Promise<RegistrationDocument> {
    const registration = await this.registrationModel.findOne({ userId, eventId }).exec();
    if (!registration) {
      throw new BadRequestException('Você não está inscrito neste evento.');
    }
    registration.certificateRequested = true;
    return registration.save();
  }

  // Cria ou atualiza a avaliacao do usuario para o evento (upsert) e recalcula a media
  async rateEvent(eventId: string, userId: string, stars: number): Promise<RatingDocument | null> {
    const rating = await this.ratingModel
      .findOneAndUpdate(
        { userId, eventId },
        { $set: { userId, eventId, stars } },
        { upsert: true, returnDocument: 'after' },
      )
      .exec();

    // Recalcula a media e o total de avaliacoes do evento
    const allRatings = await this.ratingModel.find({ eventId }).exec();
    const count = allRatings.length;
    const average = count > 0
      ? allRatings.reduce((sum, r) => sum + r.stars, 0) / count
      : 0;

    await this.eventModel.findByIdAndUpdate(eventId, {
      ratingAverage: Math.round(average * 10) / 10,
      ratingCount: count,
    }).exec();

    return rating;
  }

  // Adiciona o evento aos favoritos do usuario de forma idempotente
  async addFavorite(eventId: string, userId: string): Promise<FavoriteDocument | null> {
    return this.favoriteModel
      .findOneAndUpdate(
        { userId, eventId },
        { $setOnInsert: { userId, eventId } },
        { upsert: true, returnDocument: 'after' },
      )
      .exec();
  }

  // Remove o evento dos favoritos do usuario
  async removeFavorite(eventId: string, userId: string): Promise<void> {
    await this.favoriteModel.deleteOne({ userId, eventId }).exec();
  }

  // Retorna todos os eventos favoritados pelo usuario
  async getFavorites(userId: string): Promise<EventDocument[]> {
    const favorites = await this.favoriteModel.find({ userId }).exec();
    const eventIds = favorites.map((f) => f.eventId);
    return this.eventModel
      .find({ _id: { $in: eventIds } })
      .populate('categoryId', 'name')
      .populate('spaceId', 'name')
      .sort({ date: 1 })
      .exec();
  }

  // Retorna os dados do evento enriquecidos com informacoes do usuario autenticado (se disponivel)
  async findOneWithUserData(
    id: string,
    userId?: string,
  ): Promise<(Omit<EventDocument, keyof Document> & {
    userRegistration: { status: string } | null;
    userRating: { stars: number } | null;
    isFavorited: boolean;
  }) | null> {
    const event = await this.findOne(id);
    if (!event) return null;

    if (userId) {
      const [reg, rating, fav] = await Promise.all([
        this.registrationModel.findOne({ userId, eventId: id }).exec(),
        this.ratingModel.findOne({ userId, eventId: id }).exec(),
        this.favoriteModel.findOne({ userId, eventId: id }).exec(),
      ]);

      return {
        ...event.toObject(),
        userRegistration: reg ? {
          status: reg.status,
          certificateRequested: reg.certificateRequested,
          certificateIssued: reg.certificateIssued,
          certificateDocId: reg.certificateDocId ?? null,
        } : null,
        userRating: rating ? { stars: rating.stars } : null,
        isFavorited: !!fav,
      } as any;
    }

    return {
      ...event.toObject(),
      userRegistration: null,
      userRating: null,
      isFavorited: false,
    } as any;
  }

  // Atualiza campos de um evento
  async updateEvent(id: string, data: Partial<Event>): Promise<EventDocument | null> {
    return this.eventModel
      .findByIdAndUpdate(id, { $set: data }, { returnDocument: 'after' })
      .populate('categoryId', 'name')
      .populate('spaceId', 'name')
      .exec();
  }

  // Remove um evento pelo id
  async deleteEvent(id: string): Promise<void> {
    await this.eventModel.findByIdAndDelete(id).exec();
  }
}
