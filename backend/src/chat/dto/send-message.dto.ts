import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MaxLength(2000)
  content: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  offerAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  offerQuantity?: number;
}

export class JoinConversationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  conversationId: number;
}
