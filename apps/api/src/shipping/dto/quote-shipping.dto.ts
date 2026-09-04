import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

export class QuoteItemDto {
  @IsString()
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'A quantidade mínima é 1' })
  quantity!: number;
}

export class QuoteShippingDto {
  @IsString()
  @Matches(/^\d{5}-?\d{3}$/, { message: 'CEP inválido. Use o formato 00000-000.' })
  zipCode!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Informe ao menos um item para calcular o frete' })
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items!: QuoteItemDto[];
}
