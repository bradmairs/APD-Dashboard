-- CreateEnum
CREATE TYPE "LimitType" AS ENUM ('MAX', 'MIN');

-- CreateTable
CREATE TABLE "EnvironmentalMonitoringRecord" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parameter" TEXT NOT NULL,
    "location" TEXT,
    "monitoringDate" TIMESTAMP(3) NOT NULL,
    "readingValue" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "limitValue" DOUBLE PRECISION,
    "limitType" "LimitType" NOT NULL DEFAULT 'MAX',
    "correctiveAction" TEXT,
    "notes" TEXT,
    "monitoredById" TEXT,
    "monitoredByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnvironmentalMonitoringRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnvironmentalMonitoringRecord_projectId_idx" ON "EnvironmentalMonitoringRecord"("projectId");

-- AddForeignKey
ALTER TABLE "EnvironmentalMonitoringRecord" ADD CONSTRAINT "EnvironmentalMonitoringRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvironmentalMonitoringRecord" ADD CONSTRAINT "EnvironmentalMonitoringRecord_monitoredById_fkey" FOREIGN KEY ("monitoredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
