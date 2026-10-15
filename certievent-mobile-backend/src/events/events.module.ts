import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';
import { Event, EventSchema } from './schemas/event.schema.js';
import { Registration, RegistrationSchema } from './schemas/registration.schema.js';
import { Rating, RatingSchema } from './schemas/rating.schema.js';
import { Favorite, FavoriteSchema } from './schemas/favorite.schema.js';
import { CategoriesModule } from '../categories/categories.module.js';
import { SpacesModule } from '../spaces/spaces.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
      { name: Registration.name, schema: RegistrationSchema },
      { name: Rating.name, schema: RatingSchema },
      { name: Favorite.name, schema: FavoriteSchema },
    ]),
    CategoriesModule,
    SpacesModule,
    AuthModule,
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService, MongooseModule],
})
export class EventsModule {}
