import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProduct } from './dto/create-product.dto';
import { create } from 'domain';
import { GetProducts } from './dto/get-products.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}
  async createProduct(userId: number, productData: CreateProduct) {
    const products = await this.prisma.product.create({
      data: {
        sellerId: userId,
        location: `${productData.location}, Nigeria`,
        name: productData.name,
        description: productData.description,
        price: productData.price,
        categoryId: productData.categoryId,
        currency: productData.currency,
        images: {
          create: productData.images.map((url) => ({ url })),
        },
        quantity: productData.quantity,
        condition: productData.condition,
        tags: {
          create: productData.tags.map((tag) => ({ name: tag })),
        },
      },
      include: {
        seller: true,
        images: true,
      },
    });

    return true;
  }
  async getProducts(query: GetProducts) {
    if (query.productId) {
      return await this.prisma.product.findUnique({
        where: {
          id: query.productId,
        },
        include: {
          seller: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              rating: true,
              numReviews: true,
            },
          },
          images: true,
          category: true,
          tags: true,
        },
      });
    }
    if (query.categoryId && !query.query) {
      console.log(query);
      return await this.prisma.product.findMany({
        where: {
          categoryId: query.categoryId,
        },
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
        take: query.limit || 20,
        skip: query.offset || 0,
        orderBy: { createdAt: 'desc' },
      });
    }
    const where: Record<string, any> = {
      quantity: {
        gte: 0,
      },
    };
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query.featured) {
      where.isFeatured = true;
    }
    if (query.condition === 'used') {
      where.NOT = {
        condition: 'New',
      };
    }
    if (query.condition === 'new') {
      where.condition = 'New';
    }
    if (query.minPrice || query.maxPrice) {
      where.price = {};
      if (query.minPrice) {
        where.price.gte = query.minPrice;
      }
      if (query.maxPrice) {
        where.price.lte = query.maxPrice;
      }
    }
    if (query.query) {
      const terms = query.query
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      where.AND = terms.map((word) => ({
        OR: [
          {
            name: {
              contains: word,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: word,
              mode: 'insensitive',
            },
          },
        ],
      }));
    }

    const orderBy =
      query.sort === 'budget'
        ? { price: 'asc' as const }
        : query.sort === 'premium'
          ? { price: 'desc' as const }
          : { createdAt: 'desc' as const };

    const products = await this.prisma.product.findMany({
      where,
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
      take: query.limit || 20,
      skip: query.offset || 0,
      orderBy,
    });
    return products;
  }

  async getSearchSuggestions(
    query: string,
    categoryId: number,
    limit = 20,
  ): Promise<string[]> {
    if (!query || typeof query !== 'string') return [];

    // sanitize: keep alphanumerics, spaces and dashes; lowercase for consistent matching
    const cleaned = query
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '');
    if (cleaned.length < 2) return [];

    const token = cleaned.split(/\s+/)[0]; // use first token for suggestions
    const suggestions: string[] = [];

    // 1) Product name prefix matches (best results)
    const namePrefix = await this.prisma.product.findMany({
      where: {
        name: {
          startsWith: token,
          mode: 'insensitive',
        },
        ...(categoryId ? { categoryId } : {}),
      },
      distinct: ['name'],
      select: { name: true },
      take: limit,
    });
    for (const r of namePrefix) suggestions.push(r.name);

    // 2) Tag prefix matches to broaden suggestions
    if (suggestions.length < limit) {
      const tagPrefix = await this.prisma.productTag.findMany({
        where: {
          name: {
            startsWith: token,
            mode: 'insensitive',
          },
        },
        distinct: ['name'],
        select: { name: true },
        take: limit - suggestions.length,
      });
      for (const r of tagPrefix)
        if (!suggestions.includes(r.name)) suggestions.push(r.name);
    }

    // 3) Fallback: product name contains matches
    if (suggestions.length < limit) {
      const nameContains = await this.prisma.product.findMany({
        where: {
          name: { contains: token, mode: 'insensitive' },
          ...(categoryId ? { categoryId } : {}),
        },
        distinct: ['name'],
        select: { name: true },
        take: limit - suggestions.length,
      });
      for (const r of nameContains)
        if (!suggestions.includes(r.name)) suggestions.push(r.name);
    }

    return suggestions.slice(0, limit);
  }
}
