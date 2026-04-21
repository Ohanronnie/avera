import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RecordSearchKeywordDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  query: string;

  @IsOptional()
  @IsString()
  source?: string;
}
