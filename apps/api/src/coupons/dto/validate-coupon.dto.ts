import { Type } from 'class-transformer';
import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class ValidateCouponDto {
  @IsString()
  @MinLength(3, { message: 'Informe o código do cupom' })
  code!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  subtotalCents!: number;
}
