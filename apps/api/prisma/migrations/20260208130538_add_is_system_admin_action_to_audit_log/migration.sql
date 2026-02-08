-- DropForeignKey
ALTER TABLE "RolePermission" DROP CONSTRAINT "RolePermission_roleId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "isSystemAdminAction" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Discount" ADD COLUMN     "conditionCategoryId" TEXT,
ADD COLUMN     "conditionProductId" TEXT,
ADD COLUMN     "conditionTargetType" "DiscountTargetType" NOT NULL DEFAULT 'ORDER_TOTAL';

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "ServiceRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_conditionCategoryId_fkey" FOREIGN KEY ("conditionCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_conditionProductId_fkey" FOREIGN KEY ("conditionProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
