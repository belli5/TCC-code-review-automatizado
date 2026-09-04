import { Type } from 'class-transformer';
import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateReviewDto {
  @IsString()
  @MinLength(2, { message: 'Informe seu nome' })
  @MaxLength(60)
  author!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'A nota vai de 1 a 5 estrelas' })
  @Max(5, { message: 'A nota vai de 1 a 5 estrelas' })
  rating!: number;

  @IsString()
  @MinLength(5, { message: 'Escreva um comentário com pelo menos 5 caracteres' })
  @MaxLength(500)
  comment!: string;
}
