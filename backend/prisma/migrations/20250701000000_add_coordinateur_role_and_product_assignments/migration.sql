-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'COORDINATEUR';

-- CreateTable
CREATE TABLE "user_product_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_product_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_product_assignments_userId_idx" ON "user_product_assignments"("userId");

-- CreateIndex
CREATE INDEX "user_product_assignments_productName_idx" ON "user_product_assignments"("productName");

-- CreateIndex
CREATE UNIQUE INDEX "user_product_assignments_userId_productName_key" ON "user_product_assignments"("userId", "productName");

-- AddForeignKey
ALTER TABLE "user_product_assignments" ADD CONSTRAINT "user_product_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;