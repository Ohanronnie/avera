import { BadRequestException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { config } from 'process';
import { PrismaService } from 'src/prisma/prisma.service';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }
  async validate(payload: any) {
    let userDetails = { userId: payload.sub, email: payload.email };
    const user = await this.prismaService.user.findUnique({
      where: {
        id: userDetails.userId,
      }
    });
    if (!user) {
      throw new BadRequestException('User not found');
    } else if (!user.accountVerified) {
      throw new BadRequestException({
        message: 'User account not verified',
        code: 'ACCOUNT_NOT_VERIFIED',
        email: user.email,
        userId: user.id,
      });
    }
    return {
      userId: user.id,
      email: user.email,
    };
  }
}
