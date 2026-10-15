-- CreateEnum
CREATE TYPE "SubcontractorStatus" AS ENUM ('ENGAGED', 'ACTIVE', 'COMPLETED', 'TERMINATED');

-- CreateTable
CREATE TABLE "Subcontractor" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "trade" TEXT,
    "contactName" TEXT,
    "contactDetails" TEXT,
    "contractValue" DECIMAL(14,2),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "SubcontractorStatus" NOT NULL DEFAULT 'ENGAGED',
    "insuranceExpiry" TIMESTAMP(3),
    "notes" TEXT,
    "addedById" TEXT,
    "addedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subcontractor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Subcontractor_projectId_idx" ON "Subcontractor"("projectId");

-- AddForeignKey
ALTER TABLE "Subcontractor" ADD CONSTRAINT "Subcontractor_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subcontractor" ADD CONSTRAINT "Subcontractor_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
