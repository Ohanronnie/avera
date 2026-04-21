-- CreateTable
CREATE TABLE "prisma"."Wishlist" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_userId_productId_key" ON "prisma"."Wishlist"("userId", "productId");

-- CreateIndex
CREATE INDEX "Wishlist_productId_idx" ON "prisma"."Wishlist"("productId");

-- AddForeignKey
ALTER TABLE "prisma"."Wishlist" ADD CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "prisma"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prisma"."Wishlist" ADD CONSTRAINT "Wishlist_productId_fkey" FOREIGN KEY ("productId") REFERENCES "prisma"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
