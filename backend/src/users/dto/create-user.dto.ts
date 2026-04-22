import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  ValidateIf,
  IsOptional,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

export class CreateUserInfoDto implements CreateUserInfo {
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name cannot be empty' })
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(50, { message: 'First name cannot be longer than 50 characters' })
  @Matches(/^[A-Za-z]+$/, { message: 'First name can only contain letters' })
  firstName: string;

  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name cannot be empty' })
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Last name cannot be longer than 50 characters' })
  @Matches(/^[A-Za-z]+$/, { message: 'Last name can only contain letters' })
  lastName: string;

  @IsString({ message: 'Username must be a string' })
  @IsNotEmpty({ message: 'Username cannot be empty' })
  @MinLength(4, { message: 'Username must be at least 4 characters long' })
  @MaxLength(15, { message: 'Username cannot be longer than 15 characters' })
  @Matches(/^[A-Za-z](?!.*_$)[A-Za-z0-9_]{3,14}$/, {
    message:
      'Username must start with a letter, can contain only letters, numbers, and underscores, and cannot end with an underscore. Length: 4-15 characters.',
  })
  username: string;

  @IsOptional()
  @ValidateIf((object, value) => {
    return !!value;
  })
  @IsString({ message: 'Bio must be a string' })
  @MaxLength(255, { message: 'Bio cannot be than 255 characters' })
  bio?: string;

  @IsString({ message: 'Phone number must be a string' })
  @IsNotEmpty({ message: 'Phone number cannot be empty' })
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
  @MaxLength(120, { message: 'Country cannot be longer than 120 characters' })
  @Type(() => String)
  country?: string;

  @IsString({ message: 'State must be a string' })
  @IsNotEmpty({ message: 'State cannot be empty' })
  @MaxLength(120, { message: 'State cannot be longer than 120 characters' })
  @Type(() => String)
  state: string;

  @IsString({ message: 'City must be a string' })
  @IsNotEmpty({ message: 'City cannot be empty' })
  @MaxLength(120, { message: 'City cannot be longer than 120 characters' })
  @Type(() => String)
  city: string;

  @IsString({ message: 'Address must be a string' })
  @IsNotEmpty({ message: 'House address cannot be empty' })
  @MaxLength(300, {
    message: 'House address cannot be longer than 300 characters',
  })
  @Type(() => String)
  address: string;

  @IsOptional()
  @IsString({ message: 'Zip code must be a string' })
  @MaxLength(40, { message: 'Zip code cannot be longer than 40 characters' })
  @Type(() => String)
  zipCode?: string;
}
export type CreateUserInfo = {
  firstName: string;
  lastName: string;
  username: string;
  bio?: string;
  phoneNumber: string;
  country?: string;
  state: string;
  city: string;
  address: string;
  zipCode?: string;
};
