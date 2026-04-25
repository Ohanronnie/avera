import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { OrderSource } from 'src/generated/prisma/enums';

@ValidatorConstraint({ name: 'isNigerianPhoneNumber', async: false })
class IsNigerianPhoneNumberConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    if (typeof value !== 'string' || !value.trim()) return false;

    try {
      const parsed =
        parsePhoneNumberFromString(value, 'NG') ||
        parsePhoneNumberFromString(value);

      return Boolean(parsed?.isValid() && parsed.country === 'NG');
    } catch {
      return false;
    }
  }

  defaultMessage() {
    return 'Delivery phone must be a valid Nigerian phone number';
  }
}

export class CreateOrderDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  conversationId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @IsIn([OrderSource.BUY_NOW, OrderSource.OFFER])
  source: OrderSource;

  @IsString()
  @MaxLength(120)
  deliveryName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  @Transform(({ value }) => {
    if (!value) return value;

    try {
      const parsed =
        parsePhoneNumberFromString(String(value), 'NG') ||
        parsePhoneNumberFromString(String(value));

      if (parsed?.isValid() && parsed.country === 'NG') {
        return parsed.number;
      }
    } catch {}

    return value;
  })
  @Validate(IsNigerianPhoneNumberConstraint)
  deliveryPhone: string;

  @IsString()
  @MaxLength(300)
  deliveryAddress: string;

  @IsString()
  @MaxLength(120)
  deliveryCity: string;

  @IsString()
  @MaxLength(120)
  deliveryState: string;
}
