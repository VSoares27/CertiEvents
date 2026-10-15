import { Controller, Get } from '@nestjs/common';
import { RankingService } from './ranking.service.js';

// Controlador público para consulta do ranking geral de participantes — sem autenticação
@Controller('ranking')
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  // Retorna o ranking geral de participantes ordenado por pontuação acumulada de certificados
  @Get()
  getRanking() {
    return this.rankingService.getRanking();
  }
}
