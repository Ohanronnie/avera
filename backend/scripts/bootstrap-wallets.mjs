import { config as loadEnv } from 'dotenv';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, '../.env'), quiet: true });

const require = createRequire(import.meta.url);
const { PrismaClient } = require('../dist/src/generated/prisma/client.js');
const schema = new URL(process.env.DATABASE_URL).searchParams.get('schema');
const adapter = new PrismaPg(
  {
    connectionString: process.env.DATABASE_URL,
  },
  schema ? { schema } : undefined,
);
const prisma = new PrismaClient({ adapter });
const BANK_NAME = 'Avera Test Bank';

const displayNameFor = (user) => {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return fullName || user.username || user.email || 'Avera User';
};

const generateAccountNumber = async () => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const accountNumber = `9${Math.floor(
      100000000 + Math.random() * 900000000,
    )}`;
    const existing = await prisma.wallet.findUnique({
      where: { accountNumber },
      select: { id: true },
    });

    if (!existing) return accountNumber;
  }

  throw new Error('Unable to generate a unique account number.');
};

const main = async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      wallet: { select: { id: true, accountNumber: true } },
    },
    orderBy: { id: 'asc' },
  });

  let created = 0;
  let skipped = 0;

  for (const user of users) {
    if (user.wallet) {
      skipped += 1;
      console.log(
        `skip user ${user.id}: wallet already exists (${user.wallet.accountNumber})`,
      );
      continue;
    }

    const wallet = await prisma.wallet.create({
      data: {
        userId: user.id,
        accountName: displayNameFor(user),
        accountNumber: await generateAccountNumber(),
        bankName: BANK_NAME,
      },
      select: {
        accountNumber: true,
        accountName: true,
      },
    });

    created += 1;
    console.log(
      `created user ${user.id}: ${wallet.accountNumber} (${wallet.accountName})`,
    );
  }

  console.log(
    `wallet bootstrap complete: ${created} created, ${skipped} skipped, ${users.length} users checked`,
  );
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
