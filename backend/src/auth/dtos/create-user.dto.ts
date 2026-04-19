import {
  IsNotEmpty,
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
  ValidateIf,
  Max,
  IsOptional,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import { LoginUser, LoginUserDto } from './login-user.dto';

export class CreateUserInfoDto {
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
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(30, { message: 'Username cannot be longer than 30 characters' })
  @Matches(/^[A-Za-z][A-Za-z0-9_]{3,14}$/, {
    message:
      'Username must start with a letter and can contain only letters, numbers, and underscores. Length: 4-15 characters.',
  })
  username: string;

  @IsOptional()
  @IsString({ message: 'Bio must be a string' })
  @Max(255, { message: 'Bio cannot be than 255 characters' })
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
}
export type CreateUserInfo = {
  firstName: string;
  lastName: string;
  username: string;
  bio?: string;
  phoneNumber: string;
};
export class CreateUserDto extends LoginUserDto {}
export type CreateUser = LoginUser;
