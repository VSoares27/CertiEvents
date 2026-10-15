import { IsNumber, Max, Min } from 'class-validator';

// DTO para validacao da avaliacao de um evento (1 a 5 estrelas)
export class RateEventDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  stars: number;
}
