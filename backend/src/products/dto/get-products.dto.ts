import { Transform, Type } from 'class-transformer';
import {
  IsOptional,
  IsInt,
  Min,
  IsNumber,
  IsString,
  MaxLength,
} from 'class-validator';

export type GetProducts = {
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  query?: string;
  productId?: number;
  limit?: number;
  offset?: number | number;
  featured?: boolean;
  condition?: string;
  sort?: string;
};
export class GetProductsDto implements GetProducts {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  categoryId?: number;

  @IsOptional()
  @IsNumber({}, { message: 'minPrice must be a number' })
  @Type(() => Number)
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'maxPrice must be a number' })
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  query?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  productId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  featured?: boolean;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsString()
  sort?: string;
}
