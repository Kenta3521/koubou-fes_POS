-- AlterTable
ALTER TABLE "TransactionItem" ADD COLUMN     "appliedDiscountId" TEXT,
ADD COLUMN     "discountAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "originalPrice" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "TransactionItem" ADD CONSTRAINT "TransactionItem_appliedDiscountId_fkey" FOREIGN KEY ("appliedDiscountId") REFERENCES "Discount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
