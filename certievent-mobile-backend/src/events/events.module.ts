import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';
import { Event, EventSchema } from './schemas/event.schema.js';
import { Registration, RegistrationSchema } from './schemas/registration.schema.js';
import { CategoriesModule } from '../categories/categories.module.js';
import { SpacesModule } from '../spaces/spaces.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
      { name: Registration.name, schema: RegistrationSchema },
    ]),
    CategoriesModule,
    SpacesModule,
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService, MongooseModule],
})
export class EventsModule {}