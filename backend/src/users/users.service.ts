import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserInfo } from './dto/create-user.dto';
import { UpdateProfile } from './dto/update-profile.dto';
import { ChangePassword } from './dto/change-password.dto';

import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  async createUserInfo(
    userInfo: CreateUserInfo,
    userId: number,
  ): Promise<true> {
    const { firstName, lastName, phoneNumber, username, bio } = userInfo;

    await this.prisma.user.update({
      where: { id: userId },
      data: { firstName, lastName, phoneNumber, username, bio },
    });

    return true;
  }

  // GET /users/me
  async getCurrentUserProfile(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.firstName)
      return {
        infoUpdated: false,
      };
    return {
      infoUpdated: !!user.firstName,
      fullName: `${user.firstName} ${user.lastName}`,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      phoneNumber: user.phoneNumber,
      location: {
        address: user.address,
        city: user.city,
        state: user.state,
        country: user.country,
        zipCode: user.zipCode,
      },
    };
  }

  // PATCH /users/me
  async updateCurrentUserProfile(userId: number, data: UpdateProfile) {
    try {
      const dataToUpdate: Partial<any> = {
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
        phoneNumber: data.phoneNumber,
      };
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: dataToUpdate,
      });
      const user = updated;
      return {
        fullName: `${user.firstName} ${user.lastName}`,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        phoneNumber: user.phoneNumber,
        location: {
          address: user.address,
          city: user.city,
          state: user.state,
          country: user.country,
          zipCode: user.zipCode,
        },
      };
    } catch (e) {
      throw new BadRequestException('Could not update profile');
    }
  }

  // PATCH /users/me/password
  async changePassword(userId: number, data: ChangePassword) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const isMatch = await bcrypt.compare(data.oldPassword, user.password || '');
    if (!isMatch) throw new BadRequestException('Old password is incorrect');

    const saltRounds = 10;
    const newHashed = await bcrypt.hash(data.newPassword, saltRounds);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: newHashed },
    });

    return { message: 'Password updated' };
  }

  async getUserById(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new BadRequestException('User not found');

    // to do return sold counts for a seller

    const [productsCount, stats] = await Promise.all([
      this.prisma.product.count({
        where: { sellerId: id },
      }),
      this.prisma.review.aggregate({
        where: {
          product: {
            sellerId: user.id,
          },
        },
        _avg: {
          rating: true,
        },
      }),
    ]);

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      location: {
        address: user.address,
        city: user.city,
        state: user.state,
        country: user.country,
        zipCode: user.zipCode,
      },
      productsCount,
      averageRating: stats._avg.rating || 0,
    };
  }

  async getSellerListings(id: number, limit = 20, offset = 0) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!user) throw new BadRequestException('User not found');

    const pageSize = Math.min(Math.max(limit, 1), 50);
    const pageOffset = Math.max(offset, 0);

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { sellerId: id },
        include: {
          seller: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          images: true,
          category: true,
        },
        take: pageSize,
        skip: pageOffset,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({
        where: { sellerId: id },
      }),
    ]);

    return {
      items,
      total,
      limit: pageSize,
      offset: pageOffset,
      hasMore: pageOffset + items.length < total,
    };
  }
}
