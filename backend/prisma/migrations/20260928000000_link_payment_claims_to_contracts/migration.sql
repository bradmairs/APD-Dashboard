-- AlterTable
ALTER TABLE "PaymentClaim" ADD COLUMN     "contractId" TEXT;

-- CreateIndex
CREATE INDEX "PaymentClaim_contractId_idx" ON "PaymentClaim"("contractId");

-- AddForeignKey
ALTER TABLE "PaymentClaim" ADD CONSTRAINT "PaymentClaim_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ContractRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
