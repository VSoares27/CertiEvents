import { Module } from '@nestjs/common';
import { RankingController } from './ranking.controller.js';
import { RankingService } from './ranking.service.js';
import { CertificatesModule } from '../certificates/certificates.module.js';
import { AuthModule } from '../auth/auth.module.js';

// Módulo de ranking que depende dos modelos de Certificate (via CertificatesModule) e User (via AuthModule)
@Module({
  imports: [CertificatesModule, AuthModule],
  controllers: [RankingController],
  providers: [RankingService],
})
export class RankingModule {}
