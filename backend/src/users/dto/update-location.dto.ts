import { IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateLocationDto {
  @IsOptional()
  @IsString({ message: 'Country must be a string' })
  @Type(() => String)
  country?: string;

  @IsOptional()
  @IsString({ message: 'State must be a string' })
  @Type(() => String)
  state?: string;

  @IsOptional()
  @IsString({ message: 'City must be a string' })
  @Type(() => String)
  city?: string;

  @IsOptional()
  @IsString({ message: 'Address must be a string' })
  @Type(() => String)
  address?: string;

  @IsOptional()
  @IsString({ message: 'Zip code must be a string' })
  @Type(() => String)
  zipCode?: string;
}
