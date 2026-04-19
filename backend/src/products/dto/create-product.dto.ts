import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsNumber,
  Min,
  IsInt,
  IsPositive,
  IsArray,
  ArrayUnique,
  IsUrl,
  IsOptional,
  IsIn,
  ArrayMinSize,
  IsDefined,
  ValidateIf,
  Max,
  ArrayMaxSize,
} from 'class-validator';

const NIGERIAN_STATES = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'Abuja',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
];
export interface CreateProduct {
  name: string;
  description: string;
  price: number;
  categoryId: number;
  images: string[];
  quantity: number;
  condition: string;
  tags: string[];
  currency: string;
  location: string;
}

export class CreateProductDto implements CreateProduct {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;

  @IsString()
  @IsIn([
    /*'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD',*/ 'NGN',
  ])
  currency: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0, { message: 'Price must be >= 0' })
  price: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  categoryId: number;

  @IsArray()
  @ArrayUnique()
  @IsUrl({}, { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(5, { message: 'Uploaded images too much' })
  //  @ValidateIf((o) => o.images !== undefined)
  images: string[];

  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity: number;

  @IsString()
  @IsIn(['New', 'Foreign Used', 'Local Used'])
  condition: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @ArrayMinSize(0)
  tags: string[];

  @IsString()
  @IsIn(NIGERIAN_STATES, { message: 'Invalid location!' })
  location: string;
}
