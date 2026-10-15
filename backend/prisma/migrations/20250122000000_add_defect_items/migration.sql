-- CreateEnum
CREATE TYPE "DefectStatus" AS ENUM ('OPEN', 'RECTIFIED', 'VERIFIED', 'DISPUTED');

-- CreateTable
CREATE TABLE "DefectItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "category" TEXT,
    "assignedTo" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "DefectStatus" NOT NULL DEFAULT 'OPEN',
    "dateRaised" TIMESTAMP(3) NOT NULL,
    "dateClosed" TIMESTAMP(3),
    "retentionHeld" DECIMAL(14,2),
    "raisedById" TEXT,
    "raisedByName" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DefectItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DefectItem_projectId_idx" ON "DefectItem"("projectId");

-- AddForeignKey
ALTER TABLE "DefectItem" ADD CONSTRAINT "DefectItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectItem" ADD CONSTRAINT "DefectItem_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
