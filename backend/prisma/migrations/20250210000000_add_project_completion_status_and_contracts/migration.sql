-- CreateEnum
CREATE TYPE "ContractPartyType" AS ENUM ('CONSULTANT', 'CONTRACTOR');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('ACTIVE', 'COMPLETE', 'TERMINATED');

-- AlterEnum
ALTER TYPE "ProjectStatus" ADD VALUE 'PROJECT_COMPLETION';

-- CreateTable
CREATE TABLE "ContractRecord" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "partyType" "ContractPartyType" NOT NULL,
    "partyName" TEXT NOT NULL,
    "discipline" TEXT,
    "contractNumber" TEXT,
    "contractForm" TEXT,
    "contractValue" DECIMAL(14,2),
    "retentionPercent" DECIMAL(5,2),
    "defectsLiabilityMonths" INTEGER,
    "executionDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "completionDate" TIMESTAMP(3),
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "addedById" TEXT,
    "addedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractRecord_projectId_idx" ON "ContractRecord"("projectId");

-- AddForeignKey
ALTER TABLE "ContractRecord" ADD CONSTRAINT "ContractRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractRecord" ADD CONSTRAINT "ContractRecord_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
