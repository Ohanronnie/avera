import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CategoriesService implements OnModuleInit {
  private readonly logger = new Logger('Category');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Seed default categories. Uses upsert on the unique `name` field to avoid duplicates.
   */
  async seedDefaultCategories() {
    const categories = [
      // High-demand / very common
      {
        name: 'Electronics',
        description: 'Devices, gadgets and accessories',
        imageUrl: null,
        iconName: 'phone-portrait-outline',
      },
      {
        name: 'Clothing',
        description: 'Apparel for men, women and children',
        imageUrl: null,
        iconName: 'shirt-outline',
      },
      {
        name: 'Home & Kitchen',
        description: 'Home goods, kitchenware and appliances',
        imageUrl: null,
        iconName: 'home-outline',
      },
      {
        name: 'Beauty & Health',
        description: 'Personal care, beauty and wellness products',
        imageUrl: null,
        iconName: 'heart-outline',
      },

      // Medium demand
      {
        name: 'Sports & Outdoors',
        description: 'Fitness, outdoor and sports equipment',
        imageUrl: null,
        iconName: 'bicycle-outline',
      },
      {
        name: 'Toys & Games',
        description: 'Toys, board games and hobbies',
        imageUrl: null,
        iconName: 'game-controller-outline',
      },
      {
        name: 'Automotive',
        description: 'Cars, motorcycles, auto parts and accessories',
        imageUrl: null,
        iconName: 'car-outline',
      },
      {
        name: 'Books & Media',
        description: 'Books, movies, music, and digital media',
        imageUrl: null,
        iconName: 'book-outline',
      },
      {
        name: 'Furniture',
        description: 'Indoor and outdoor furniture',
        imageUrl: null,
        iconName: 'bed-outline',
      },
      {
        name: 'Jewelry & Accessories',
        description: 'Watches, bags, and fashion accessories',
        imageUrl: null,
        iconName: 'sparkles-outline',
      },
      {
        name: 'Baby & Kids',
        description: 'Baby gear, kids clothing, toys',
        imageUrl: null,
        iconName: 'happy-outline',
      },
      {
        name: 'Pet Supplies',
        description: 'Food, toys, and accessories for pets',
        imageUrl: null,
        iconName: 'paw-outline',
      },

      // Niche categories
      {
        name: 'Office & School Supplies',
        description: 'Stationery, office equipment, school items',
        imageUrl: null,
        iconName: 'document-text-outline',
      },
      {
        name: 'Garden & Tools',
        description: 'Gardening tools, plants, and hardware',
        imageUrl: null,
        iconName: 'leaf-outline',
      },
      {
        name: 'Musical Instruments',
        description: 'Guitars, keyboards, drums, and accessories',
        imageUrl: null,
        iconName: 'musical-notes-outline',
      },
      {
        name: 'Collectibles & Art',
        description: 'Antiques, art, coins, and unique collectibles',
        imageUrl: null,
        iconName: 'color-palette-outline',
      },
      {
        name: 'Industrial & Business',
        description: 'Machinery, tools, and business supplies',
        imageUrl: null,
        iconName: 'business-outline',
      },
      {
        name: 'Real Estate',
        description: 'Properties, rentals, and land',
        imageUrl: null,
        iconName: 'home-sharp',
      },
      {
        name: 'Services',
        description: 'Freelance, repair, cleaning, tutoring, etc.',
        imageUrl: null,
        iconName: 'briefcase-outline',
      },
    ];

    for (const cat of categories) {
      await this.prisma.category.upsert({
        where: { name: cat.name },
        update: {
          description: cat.description,
          imageUrl: cat.imageUrl,
          updatedAt: new Date(),
          iconName: cat.iconName,
        },
        create: {
          name: cat.name,
          description: cat.description,
          imageUrl: cat.imageUrl,
          iconName: cat.iconName,
        },
      });
    }
  }

  async onModuleInit() {
    try {
      await this.seedDefaultCategories();
      this.logger.log('Category seeding complete.');
    } catch (err) {
      this.logger.error('Category seeding failed:', err);
    }
  }

  async getAllCategories() {
    return this.prisma.category.findMany();
  }
}
