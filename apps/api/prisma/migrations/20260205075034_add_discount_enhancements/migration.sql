-- CreateEnum
CREATE TYPE "DiscountTargetType" AS ENUM ('ORDER_TOTAL', 'SPECIFIC_PROD', 'CATEGORY');

-- CreateEnum
CREATE TYPE "DiscountConditionType" AS ENUM ('NONE', 'MIN_QUANTITY', 'MIN_AMOUNT');

-- CreateEnum
CREATE TYPE "DiscountTriggerType" AS ENUM ('MANUAL', 'AUTO');

-- AlterTable
ALTER TABLE "Discount" ADD COLUMN     "conditionType" "DiscountConditionType" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "conditionValue" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "targetProductId" TEXT,
ADD COLUMN     "targetType" "DiscountTargetType" NOT NULL DEFAULT 'ORDER_TOTAL',
ADD COLUMN     "triggerType" "DiscountTriggerType" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "validFrom" TIMESTAMP(3),
ADD COLUMN     "validTo" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_targetProductId_fkey" FOREIGN KEY ("targetProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
