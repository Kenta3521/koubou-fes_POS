/*
  Warnings:

  - A unique constraint covering the columns `[paypayCodeId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "paypayCodeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_paypayCodeId_key" ON "Transaction"("paypayCodeId");
