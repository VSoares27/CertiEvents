import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeaturedController } from './featured.controller.js';
import { FeaturedService } from './featured.service.js';
import { Featured, FeaturedSchema } from './schemas/featured.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Featured.name, schema: FeaturedSchema },
    ]),
  ],
  controllers: [FeaturedController],
  providers: [FeaturedService],
  exports: [FeaturedService],
})
export class FeaturedModule {}
