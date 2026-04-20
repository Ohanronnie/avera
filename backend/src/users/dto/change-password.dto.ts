import { IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class ChangePasswordDto {
  @IsString({ message: 'Old password must be a string' })
  @Type(() => String)
  oldPassword: string;

  @IsString({ message: 'New password must be a string' })
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  @Type(() => String)
  newPassword: string;
}
export type ChangePassword = {
  oldPassword: string;
  newPassword: string;
};
