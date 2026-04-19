/*
  Warnings:

  - You are about to drop the `ProductVideo` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "prisma"."ProductVideo" DROP CONSTRAINT "ProductVideo_productId_fkey";

-- DropTable
DROP TABLE "prisma"."ProductVideo";
