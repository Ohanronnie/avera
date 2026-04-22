import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { OrderSource } from 'src/generated/prisma/enums';

export class CreateOrderDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  conversationId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  offerMessageId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsIn(['buy_now', 'offer', OrderSource.BUY_NOW, OrderSource.OFFER])
  source?: 'buy_now' | 'offer' | OrderSource;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  deliveryName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  deliveryPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  deliveryAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  deliveryCity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  deliveryState?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  deliveryCountry?: string;
}
