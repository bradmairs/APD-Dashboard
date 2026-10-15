-- CreateEnum
CREATE TYPE "RagStatus" AS ENUM ('GREEN', 'AMBER', 'RED');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "bpRefNo" TEXT;
ALTER TABLE "Project" ADD COLUMN "projectDirector" TEXT;
ALTER TABLE "Project" ADD COLUMN "projectSponsor" TEXT;

-- CreateTable
CREATE TABLE "MonthlyReport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "reportingMonth" TIMESTAMP(3) NOT NULL,
    "projectPhase" TEXT NOT NULL,
    "currentStatus" TEXT NOT NULL,
    "recentlyCompleted" TEXT,
    "monthlyLookahead" TEXT,
    "budgetHealth" "RagStatus" NOT NULL DEFAULT 'GREEN',
    "budgetComments" TEXT,
    "scheduleHealth" "RagStatus" NOT NULL DEFAULT 'GREEN',
    "scheduleComments" TEXT,
    "createdById" TEXT,
    "authorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyReport_projectId_reportingMonth_key" ON "MonthlyReport"("projectId", "reportingMonth");

-- CreateIndex
CREATE INDEX "MonthlyReport_projectId_idx" ON "MonthlyReport"("projectId");

-- AddForeignKey
ALTER TABLE "MonthlyReport" ADD CONSTRAINT "MonthlyReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyReport" ADD CONSTRAINT "MonthlyReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
