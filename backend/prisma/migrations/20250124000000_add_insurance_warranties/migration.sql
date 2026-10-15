-- CreateEnum
CREATE TYPE "InsuranceWarrantyType" AS ENUM ('INSURANCE', 'WARRANTY');

-- CreateTable
CREATE TABLE "InsuranceWarranty" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "InsuranceWarrantyType" NOT NULL,
    "title" TEXT NOT NULL,
    "provider" TEXT,
    "referenceNumber" TEXT,
    "coverageDetails" TEXT,
    "startDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceWarranty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InsuranceWarranty_projectId_idx" ON "InsuranceWarranty"("projectId");

-- AddForeignKey
ALTER TABLE "InsuranceWarranty" ADD CONSTRAINT "InsuranceWarranty_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceWarranty" ADD CONSTRAINT "InsuranceWarranty_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
