import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { createPrismaPgAdapter } from './prisma-adapter';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({ adapter: createPrismaPgAdapter() });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
