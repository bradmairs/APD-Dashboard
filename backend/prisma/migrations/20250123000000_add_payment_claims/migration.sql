-- CreateEnum
CREATE TYPE "PaymentClaimStatus" AS ENUM ('SUBMITTED', 'CERTIFIED', 'DISPUTED', 'PAID');

-- CreateTable
CREATE TABLE "PaymentClaim" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "periodEnding" TIMESTAMP(3),
    "claimedAmount" DECIMAL(14,2) NOT NULL,
    "certifiedAmount" DECIMAL(14,2),
    "status" "PaymentClaimStatus" NOT NULL DEFAULT 'SUBMITTED',
    "dateSubmitted" TIMESTAMP(3) NOT NULL,
    "dateCertified" TIMESTAMP(3),
    "datePaid" TIMESTAMP(3),
    "raisedById" TEXT,
    "raisedByName" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentClaim_projectId_idx" ON "PaymentClaim"("projectId");

-- AddForeignKey
ALTER TABLE "PaymentClaim" ADD CONSTRAINT "PaymentClaim_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentClaim" ADD CONSTRAINT "PaymentClaim_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
