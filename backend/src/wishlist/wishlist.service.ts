import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async getWishlist(userId: number) {
    const items = await this.prisma.wishlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: {
            images: true,
            category: true,
            seller: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return items.map((item) => item.product);
  }

  async getWishlistProductIds(userId: number) {
    const items = await this.prisma.wishlist.findMany({
      where: { userId },
      select: { productId: true },
    });

    return items.map((item) => item.productId);
  }

  async getWishlistStatus(userId: number, productId: number) {
    const item = await this.prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
      select: { id: true },
    });

    return { isWishlisted: Boolean(item) };
  }

  async addToWishlist(userId: number, productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    try {
      await this.prisma.wishlist.create({
        data: {
          userId,
          productId,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('Product already saved');
      }

      throw error;
    }

    return { isWishlisted: true };
  }

  async removeFromWishlist(userId: number, productId: number) {
    await this.prisma.wishlist.deleteMany({
      where: {
        userId,
        productId,
      },
    });

    return { isWishlisted: false };
  }
}
