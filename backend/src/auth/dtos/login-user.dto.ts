import {
  IsNotEmpty,
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
  ValidateIf,
  Min,
  IsNumberString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

export class LoginUserDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email cannot be empty' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password cannot be empty' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(32, { message: 'Password cannot be longer than 32 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number and 1 special character',
    },
  )
  password: string;
}
export class ResetPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString()
  @IsNotEmpty()
  otp: string;

  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password cannot be empty' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(32, { message: 'Password cannot be longer than 32 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number and 1 special character',
    },
  )
  newPassword: string;
}

export type LoginUser = {
  email: string;
  password: string;
};

export class SignupUserDto {
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name cannot be empty' })
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(50, { message: 'First name cannot be longer than 50 characters' })
  @Matches(/^[A-Za-z]+$/, { message: 'First name can only contain letters' })
  first_name: string;

  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name cannot be empty' })
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Last name cannot be longer than 50 characters' })
  @Matches(/^[A-Za-z]+$/, { message: 'Last name can only contain letters' })
  last_name: string;

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
  phone_number: string;
}

export type SignupUser = {
  first_name: string;
  last_name: string;
  phone_number: string;
};

export class OTPVerificationDto {
  @IsString({ message: 'OTP must be a string' })
  @IsNotEmpty({ message: 'OTP cannot be empty' })
  @MinLength(6, { message: 'OTP must be at least 6 characters long' })
  @MaxLength(6, { message: 'OTP cannot be longer than 6 characters' })
  otp: string;
  @IsNotEmpty()
  @IsNumberString()
  userId: string;
}
export class ResetOTPVerificationDto {
  @IsString({ message: 'OTP must be a string' })
  @IsNotEmpty({ message: 'OTP cannot be empty' })
  @MinLength(6, { message: 'OTP must be at least 6 characters long' })
  @MaxLength(6, { message: 'OTP cannot be longer than 6 characters' })
  otp: string;
  @IsString({ message: 'User ID must be a string' })
  @IsNotEmpty({ message: 'User ID cannot be empty' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}