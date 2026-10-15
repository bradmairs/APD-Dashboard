-- CreateEnum
CREATE TYPE "SqeCategory" AS ENUM ('SAFETY', 'QUALITY', 'ENVIRONMENT');

-- CreateEnum
CREATE TYPE "SqeSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SqeStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- CreateTable
CREATE TABLE "SqeRecord" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" "SqeCategory" NOT NULL,
    "severity" "SqeSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "correctiveAction" TEXT,
    "dateOccurred" TIMESTAMP(3) NOT NULL,
    "status" "SqeStatus" NOT NULL DEFAULT 'OPEN',
    "dateClosed" TIMESTAMP(3),
    "reportedById" TEXT,
    "reportedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SqeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SqeRecord_projectId_idx" ON "SqeRecord"("projectId");

-- AddForeignKey
ALTER TABLE "SqeRecord" ADD CONSTRAINT "SqeRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SqeRecord" ADD CONSTRAINT "SqeRecord_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
