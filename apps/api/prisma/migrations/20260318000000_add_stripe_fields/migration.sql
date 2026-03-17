-- AlterTable: Transaction に stripePaymentIntentId を追加
ALTER TABLE "Transaction" ADD COLUMN "stripePaymentIntentId" TEXT;
CREATE UNIQUE INDEX "Transaction_stripePaymentIntentId_key" ON "Transaction"("stripePaymentIntentId");

-- AlterTable: SystemSetting に tapToPayEnabled と stripeLocationId を追加
ALTER TABLE "SystemSetting" ADD COLUMN "tapToPayEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SystemSetting" ADD COLUMN "stripeLocationId" TEXT;
