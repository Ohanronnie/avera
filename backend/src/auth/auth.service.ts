import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OAuth2Client } from 'google-auth-library';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { LoginUser } from './dtos/login-user.dto';
import { CreateUser, CreateUserInfo } from './dtos/create-user.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RedisService } from 'src/redis/redis.service';

export type TokensResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
  };
};

export type CreateUserResponse = {
  id: number;
  email: string;
};

export type CreateUserInfoResponse = true;

export type RefreshTokenResponse = TokensResponse;

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;
  private readonly otpTtlSeconds = 5 * 60;
  private readonly resetOtpTtlSeconds = 10 * 60;
  private readonly resendCooldownSeconds = 2 * 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly eventEmitter: EventEmitter2,
    private readonly redisService: RedisService,
  ) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  // ---------------- Private Helper Methods ----------------

  /**
   * Helper method to hash data (e.g., passwords, refresh tokens).
   */
  private async hashData(data: string): Promise<string> {
    return bcrypt.hash(data, 10);
  }

  /**
   * Helper method to generate access and refresh tokens.
   */
  private async generateTokens(
    userId: number,
    email: string,
    userData: any,
  ): Promise<TokensResponse> {
    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync({ sub: userId, email }, { expiresIn: '30d' }),
      this.jwtService.signAsync({ sub: userId, email }, { expiresIn: '30d' }),
    ]);
    return {
      accessToken: access_token,
      refreshToken: refresh_token,
      user: userData,
    };
  }

  /**
   * Updates the hashed refresh token in the database.
   */
  private async updateRefreshTokenHash(
    userId: number,
    refreshToken: string,
  ): Promise<void> {
    const refreshHashed = await this.hashData(refreshToken);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshHashed },
    });
  }

  private async enforceResendCooldown(key: string): Promise<void> {
    const ttl = await this.redisService.ttl(key);

    if (ttl > 0) {
      throw new BadRequestException({
        code: 'OTP_RESEND_COOLDOWN',
        message: 'Please wait before requesting another code',
        retryAfter: ttl,
      });
    }
  }

  // ---------------- Authentication Methods ----------------

  /**
   * Logs in a user with email and password.
   */
  async login(user: LoginUser): Promise<TokensResponse> {
    const foundUser = await this.prisma.user.findUnique({
      select: {
        email: true,
        password: true,
        id: true,
        accountVerified: true,
      },
      where: { email: user.email },
    });

    if (!foundUser) {
      throw new BadRequestException('User does not exist!');
    }

    const passwordValid = await bcrypt.compare(
      user.password,
      foundUser.password || '',
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Incorrect password');
    }
    if (!foundUser.accountVerified) {
      throw new UnauthorizedException({
        code: 'ACCOUNT_NOT_VERIFIED',
        message: 'Account not verified',
        email: foundUser.email,
        userId: foundUser.id,
      });
    }

    const tokens = await this.generateTokens(foundUser.id, foundUser.email, {
      id: foundUser.id,
      email: foundUser.email,
    });

    await this.updateRefreshTokenHash(foundUser.id, tokens.refreshToken);
    return tokens;
  }

  /**
   * Validates a Google token and logs in or registers the user.
   */
  async validateGoogleToken(token: string): Promise<TokensResponse> {
    console.log(token);
    if (!token) throw new BadRequestException('Google token is required');
    console.log('Verifying Google token...');
    const ticket = await this.googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    console.log('Google token payload:', payload);
    if (!payload) {
      throw new BadRequestException('Invalid Google token');
    }

    const { sub: googleId, email } = payload;

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: email as string,
          googleId,
          accountVerified: true,
        },
      });
    }

    const tokens = await this.generateTokens(user.id, user.email, {
      id: user.id,
      email: user.email,
    });

    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);
    return tokens;
  }

  /**
   * Refreshes the access token using a valid refresh token.
   * Now takes only the refresh token, decodes it to get userId and email.
   */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    let payload: any;
    try {
      payload = this.jwtService.decode(refreshToken);
    } catch (err) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!payload || !payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid refresh token payload');
    }

    const userId = payload.sub;
    const email = payload.email;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { refreshHashed: true, email: true },
    });

    if (!user || !user.refreshHashed) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshHashed);
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(userId, email, {
      id: userId,
      email,
    });
    await this.updateRefreshTokenHash(userId, tokens.refreshToken);

    return tokens;
  }
  // ---------------- User Management Methods ----------------

  /**
   * Registers a new user.
   */
  async createUser(user: CreateUser): Promise<CreateUserResponse> {
    const { email, password } = user;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await this.hashData(password);
    const newUser = await this.prisma.user.create({
      data: { email, password: hashedPassword },
    });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.redisService.set(
      `otp:${newUser.id}`,
      await this.hashData(otp),
      this.otpTtlSeconds,
    );
    await this.redisService.set(
      `otp-cooldown:${newUser.id}`,
      '1',
      this.resendCooldownSeconds,
    );
    this.eventEmitter.emit('send.email', {
      to: newUser.email,
      subject: 'Welcome to Our Service',
      text: `Your OTP is ${otp}. Please use it to verify your account.`,
    });
    console.log(`Sent OTP for user ${newUser.email}: ${otp}`);
    return { id: newUser.id, email: newUser.email };
  }
  async resendVerificationOtp(userId: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new BadRequestException('User does not exist');
    }
    if (user.accountVerified) {
      throw new BadRequestException('Account is already verified');
    }
    await this.enforceResendCooldown(`otp-cooldown:${user.id}`);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.redisService.set(
      `otp:${user.id}`,
      await this.hashData(otp),
      this.otpTtlSeconds,
    );
    await this.redisService.set(
      `otp-cooldown:${user.id}`,
      '1',
      this.resendCooldownSeconds,
    );
    console.log(`Resent OTP for user ${user.email}: ${otp}`);
    this.eventEmitter.emit('send.email', {
      to: user.email,
      subject: 'Resend OTP for Account Verification',
      text: `Your OTP is ${otp}. Please use it to verify your account.`,
    });
  }
  /**
   * Updates user information.
   */
  async createUserInfo(
    userInfo: CreateUserInfo,
    userId: number,
  ): Promise<CreateUserInfoResponse> {
    const { firstName, lastName, phoneNumber, username, bio } = userInfo;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        phoneNumber,
        username,
        bio,
      },
    });

    return true;
  }

  /**
   * Checks if the provided username is available and valid.
   * Throws BadRequestException if invalid.
   */
  async isUsernameAvailable(username: string): Promise<{ available: boolean }> {
    if (username.length < 4) {
      throw new BadRequestException(
        'Username is too short (minimum 4 characters)',
      );
    }
    if (username.length > 15) {
      throw new BadRequestException(
        'Username is too long (maximum 15 characters)',
      );
    }
    if (!this.validateUsername(username)) {
      throw new BadRequestException(
        'Username must start with a letter and can contain only letters, numbers, and underscores.',
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    return { available: !user };
  }

  /**
   * Validates a username against the allowed pattern.
   */
  validateUsername(username: string): boolean {
    // Twitter-like: starts with letter, 4-15 chars, only letters, numbers, underscores
    return /^[A-Za-z](?!.*_$)[A-Za-z0-9_]{3,14}$/.test(username);
  }

  // ---------------- OTP Validation ----------------

  /**
   * Validates an OTP for a user.
   */
  public async validateOtp(userId: number, otp: string): Promise<boolean> {
    const hashedOtp = await this.redisService.get(`otp:${userId}`);
    if (!hashedOtp) {
      throw new BadRequestException('OTP expired or invalid');
    }
    const isValid = await bcrypt.compare(otp, hashedOtp);
    if (!isValid) {
      throw new BadRequestException('Invalid OTP');
    }
    await this.redisService.del(`otp:${userId}`); // Delete OTP after validation
    await this.redisService.del(`otp-cooldown:${userId}`);
    await this.prisma.user.update({
      where: { id: userId },
      data: { accountVerified: true },
    });
    this.eventEmitter.emit('user.verified', { userId });
    return true;
  }
  // ---------------- Password Reset Methods ----------------

  /**
   * Sends an OTP to the user's email for password reset.
   */
  async sendPasswordResetOtp(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new BadRequestException('User with this email does not exist');
    }

    await this.enforceResendCooldown(`reset-otp-cooldown:${email}`);

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP
    await this.redisService.set(
      `reset-otp:${email}`,
      await this.hashData(otp),
      this.resetOtpTtlSeconds,
    ); // Store OTP for 10 minutes
    await this.redisService.set(
      `reset-otp-cooldown:${email}`,
      '1',
      this.resendCooldownSeconds,
    );

    this.eventEmitter.emit('send.email', {
      to: user.email,
      subject: 'Password Reset Request',
      text: `Your OTP for password reset is ${otp}. It is valid for 10 minutes.`,
    });
  }

  /**
   * Verifies the OTP for password reset without deleting it.
   */
  async verifyPasswordResetOtp(email: string, otp: string): Promise<boolean> {
    const hashedOtp = await this.redisService.get(`reset-otp:${email}`);
    if (!hashedOtp) {
      throw new BadRequestException('OTP expired or invalid');
    }

    const isValid = await bcrypt.compare(otp, hashedOtp);
    if (!isValid) {
      throw new BadRequestException('Invalid OTP');
    }

    return true; // OTP is valid
  }

  /**
   * Resets the user's password after verifying the OTP.
   */
  async resetPassword(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<void> {
    // Verify OTP
    const isOtpValid = await this.verifyPasswordResetOtp(email, otp);
    if (!isOtpValid) {
      throw new BadRequestException('Invalid OTP');
    }

    // Hash the new password
    const hashedPassword = await this.hashData(newPassword);

    // Update the user's password in the database
    await this.prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    // Optionally delete the OTP after successful password reset
    await this.redisService.del(`reset-otp:${email}`);
    await this.redisService.del(`reset-otp-cooldown:${email}`);

    // Emit an event for password reset success (optional)
    this.eventEmitter.emit('user.passwordReset', { email });
  }
}
