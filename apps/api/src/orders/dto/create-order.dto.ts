import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaymentDto } from '../../payments/dto/create-payment.dto';
import { SHIPPING_SERVICES, ShippingServiceId } from '../../shipping/shipping-rules';

export class CheckoutItemDto {
  @IsString()
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'A quantidade mínima é 1' })
  quantity!: number;
}

export class CustomerDto {
  @IsString()
  @MinLength(3, { message: 'Informe seu nome completo' })
  @MaxLength(80)
  name!: string;

  @IsEmail({}, { message: 'E-mail inválido' })
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  document?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}

export class AddressDto {
  @IsString()
  @Matches(/^\d{5}-?\d{3}$/, { message: 'CEP inválido. Use o formato 00000-000.' })
  zipCode!: string;

  @IsString()
  @MinLength(3, { message: 'Informe o logradouro' })
  @MaxLength(120)
  street!: string;

  @IsString()
  @MinLength(1, { message: 'Informe o número' })
  @MaxLength(20)
  number!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  complement?: string;

  @IsString()
  @MinLength(2, { message: 'Informe o bairro' })
  @MaxLength(60)
  district!: string;

  @IsString()
  @MinLength(2, { message: 'Informe a cidade' })
  @MaxLength(60)
  city!: string;

  @IsString()
  @Length(2, 2, { message: 'Use a sigla do estado, com 2 letras' })
  state!: string;
}

export class CreateOrderDto {
  @ValidateNested()
  @Type(() => CustomerDto)
  customer!: CustomerDto;

  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;

  @IsArray()
  @ArrayMinSize(1, { message: 'O carrinho está vazio' })
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items!: CheckoutItemDto[];

  @IsIn(SHIPPING_SERVICES, { message: 'Selecione uma forma de entrega válida' })
  shippingServiceId!: ShippingServiceId;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @ValidateNested()
  @Type(() => PaymentDto)
  payment!: PaymentDto;
}
