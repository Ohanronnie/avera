import { PrismaPg } from '@prisma/adapter-pg';

export function createPrismaPgAdapter() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required to initialize Prisma.');
  }

  const schema = new URL(connectionString).searchParams.get('schema');

  return new PrismaPg({ connectionString }, schema ? { schema } : undefined);
}
