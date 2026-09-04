import { Type } from 'class-transformer';
import { IsEmail, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ORDER_STATUSES, OrderStatus } from '../../common/order-status';

export class QueryOrdersDto {
  @IsOptional()
  @IsIn(ORDER_STATUSES)
  status?: OrderStatus;

  @IsOptional()
  @IsEmail({}, { message: 'E-mail inválido' })
  email?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
