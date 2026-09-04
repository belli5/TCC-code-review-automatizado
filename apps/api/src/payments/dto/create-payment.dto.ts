import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { MAX_INSTALLMENTS, PAYMENT_METHODS, PaymentMethod } from '../gateway/fake-gateway';

export class CardDto {
  @IsString()
  @MinLength(13, { message: 'Número de cartão incompleto' })
  @MaxLength(23)
  number!: string;

  @IsString()
  @MinLength(3, { message: 'Informe o nome impresso no cartão' })
  @MaxLength(60)
  holderName!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Mês de validade inválido' })
  @Max(12, { message: 'Mês de validade inválido' })
  expMonth!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2100)
  expYear!: number;

  @IsString()
  @MinLength(3, { message: 'CVV inválido' })
  @MaxLength(4, { message: 'CVV inválido' })
  cvv!: string;
}

export class PaymentDto {
  @IsIn(PAYMENT_METHODS, { message: 'Forma de pagamento inválida' })
  method!: PaymentMethod;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_INSTALLMENTS)
  installments?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CardDto)
  card?: CardDto;
}
