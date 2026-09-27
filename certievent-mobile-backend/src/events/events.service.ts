import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from './schemas/event.schema.js';

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
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
}
