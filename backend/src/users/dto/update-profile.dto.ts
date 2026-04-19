import {
  IsOptional,
  IsString,
  IsUrl,
  IsPhoneNumber,
  Length,
  ValidateIf,
  Matches,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';

export type UpdateProfile = {
  firstName?: string;
  lastName?: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  phoneNumber?: string;
};
export class UpdateProfileDto implements UpdateProfile {
  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  @Type(() => String)
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  @Type(() => String)
  lastName?: string;

  @IsOptional()
  @IsString({ message: 'Username must be a string' })
  @Length(3, 32, { message: 'Username must be between 3 and 32 characters' })
  @Type(() => String)
  username?: string;

  @IsOptional()
  @IsString({ message: 'Bio must be a string' })
  @Length(0, 500, { message: 'Bio must be at most 500 characters' })
  @Type(() => String)
  bio?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Avatar must be a valid URL' })
  @Type(() => String)
  avatarUrl?: string;

  @IsOptional()
  @IsString({ message: 'Phone number must be a string' })
  @Transform(({ value }) => {
    if (!value) return value;
    try {
      const phoneNumber = parsePhoneNumber(value);
      if (!phoneNumber.isValid()) {
        return value;
      }
      return phoneNumber.format('E.164'); // Formats to +countrycodennnnnn
    } catch (error) {
      return value;
    }
  })
  @ValidateIf((object, value) => {
    try {
      return !value || !isValidPhoneNumber(value);
    } catch (error) {
      return true;
    }
  })
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message:
      'Please enter a valid phone number with country code (e.g., +1234567890)',
  })
  phoneNumber: string;
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
