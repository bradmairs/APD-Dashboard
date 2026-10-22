-- AlterEnum
ALTER TYPE "ChecklistPhase" ADD VALUE 'PROCUREMENT';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "upcomingManagerFilter" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "consultant" TEXT,
ADD COLUMN     "trimFolder" TEXT;

-- AlterTable
ALTER TABLE "SiteVisit" ADD COLUMN     "outcomesAndActions" TEXT;

-- AlterTable: PO is a purchase order reference, not an amount. Carry any
-- existing numeric values across as text (trailing ".00" dropped) before
-- removing the old column, so nothing entered so far is lost.
ALTER TABLE "ContractRecord" ADD COLUMN     "poNumber" TEXT;
UPDATE "ContractRecord" SET "poNumber" = trim_scale("poValue")::text WHERE "poValue" IS NOT NULL;
ALTER TABLE "ContractRecord" DROP COLUMN "poValue";

-- CreateTable
CREATE TABLE "TenderSubmission" (
    "id" TEXT NOT NULL,
    "tenderPackageId" TEXT NOT NULL,
    "tendererName" TEXT NOT NULL,
    "dateReceived" TIMESTAMP(3),
    "tenderPrice" DECIMAL(14,2),
    "conforming" BOOLEAN,
    "score" DECIMAL(5,2),
    "rank" INTEGER,
    "recommended" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdById" TEXT,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenderSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrimLink" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "createdById" TEXT,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrimLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenderSubmission_tenderPackageId_idx" ON "TenderSubmission"("tenderPackageId");

-- AddForeignKey
ALTER TABLE "TenderSubmission" ADD CONSTRAINT "TenderSubmission_tenderPackageId_fkey" FOREIGN KEY ("tenderPackageId") REFERENCES "TenderPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenderSubmission" ADD CONSTRAINT "TenderSubmission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrimLink" ADD CONSTRAINT "TrimLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

