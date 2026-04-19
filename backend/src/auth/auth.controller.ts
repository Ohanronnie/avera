import {
  Body,
  Controller,
  Post,
  Put,
  Param,
  UseGuards,
  Req,
  HttpException,
  InternalServerErrorException,
  BadRequestException,
  Query,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  LoginUserDto,
  ResetOTPVerificationDto,
  ResetPasswordDto,
} from './dtos/login-user.dto';
import { CreateUserDto, CreateUserInfoDto } from './dtos/create-user.dto';
import { OTPVerificationDto } from './dtos/login-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { isEmail } from 'class-validator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ---------------- Authentication Endpoints ----------------

  /**
   * Login endpoint for users.
   */
  @Post('login')
  async login(@Body() user: LoginUserDto) {
    try {
      return await this.authService.login(user);
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Google login or registration endpoint.
   */
  @Post('google-login')
  async googleLogin(@Body('token') token: string) {
    
    try {
      return await this.authService.validateGoogleToken(token);
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Refresh token endpoint.
   */
  @Post('refresh-token')
  //  @UseGuards(AuthGuard('jwt'))
  async refreshToken(
    @Body('refreshToken') refreshToken: string,
    @Req() request: any,
  ) {
    try {
      return await this.authService.refreshToken(refreshToken);
    } catch (error) {
      this.handleError(error);
    }
  }

  // ---------------- User Management Endpoints ----------------

  /**
   * Register a new user.
   */
  @Post('register')
  async register(@Body() user: CreateUserDto) {
    try {
      return await this.authService.createUser(user);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Post('/resend-otp/:userId')
  async resendOtp(@Param('userId') userId: string) {
    try {
      console.log(`Resend OTP requested for userId: ${userId}`);
      const userIdNum = Number(userId);
      if (isNaN(userIdNum)) {
        throw new BadRequestException('Invalid user ID');
      }
      return await this.authService.resendVerificationOtp(userIdNum);
    } catch (error) {
      this.handleError(error);
    }
  }
  /**
   * Check if a username is available.
   */
  @Get('check-username')
  @UseGuards(AuthGuard('jwt'))
  async checkUsername(@Query('username') username: string) {
    try {
      if (!username || typeof username !== 'string') {
        throw new BadRequestException('Username is required');
      }
      const available = await this.authService.isUsernameAvailable(username);
      return available;
    } catch (error) {
      this.handleError(error);
    }
  }
  /**
   * Update user information.
   */
  @Put('update-info')
  @UseGuards(AuthGuard('jwt'))
  async updateUserInfo(
    @Body() userInfo: CreateUserInfoDto,
    @Req() request: any,
  ) {
    try {
      const user = request.user;
      const userId = user.userId;
      return await this.authService.createUserInfo(userInfo, userId);
    } catch (error) {
      this.handleError(error);
    }
  }

  // ---------------- OTP Validation Endpoints ----------------

  /**
   * Validate OTP for account verification.
   */

  @Post('validate-otp')
  async validateOtp(@Body() otpVerificationDto: OTPVerificationDto) {
    try {
      const { userId, otp } = otpVerificationDto;
      return await this.authService.validateOtp(Number(userId), otp);
    } catch (error) {
      this.handleError(error);
    }
  }

  // ---------------- Password Reset Endpoints ----------------

  /**
   * Send OTP for password reset.
   */
  @Post('password-reset/send-otp')
  async sendPasswordResetOtp(@Body('email') email: string) {
    try {
      if (!isEmail(email)) {
        throw new BadRequestException('Invalid email address');
      }
      return await this.authService.sendPasswordResetOtp(email);
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Verify OTP for password reset.
   */
  @Post('password-reset/verify-otp')
  async verifyPasswordResetOtp(
    @Body() otpVerificationDto: ResetOTPVerificationDto,
  ) {
    try {
      const { email, otp } = otpVerificationDto;
      return await this.authService.verifyPasswordResetOtp(email, otp);
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Reset password using OTP.
   */
  @Post('password-reset/reset')
  async resetPassword(
    @Body()
    resetPasswordDto: ResetPasswordDto,
  ) {
    try {
      const { email, otp, newPassword } = resetPasswordDto;
      return await this.authService.resetPassword(email, otp, newPassword);
    } catch (error) {
      this.handleError(error);
    }
  }

  // ---------------- Error Handling ----------------

  /**
   * Handles errors by throwing HTTP exceptions or logging and returning a generic error.
   * @param error The error to handle.
   */
  private handleError(error: any): never {
    if (error instanceof HttpException) {
      throw error; // Re-throw HTTP exceptions
    }

    console.error('Unexpected error:', error); // Log unexpected errors
    throw new InternalServerErrorException('An unexpected error occurred');
  }
}
