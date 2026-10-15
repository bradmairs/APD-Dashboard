-- CreateEnum
CREATE TYPE "EotStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "EotClaim" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "reference" TEXT,
    "title" TEXT NOT NULL,
    "cause" TEXT,
    "description" TEXT,
    "daysClaimed" INTEGER NOT NULL,
    "daysGranted" INTEGER,
    "status" "EotStatus" NOT NULL DEFAULT 'SUBMITTED',
    "dateSubmitted" TIMESTAMP(3) NOT NULL,
    "dateDecided" TIMESTAMP(3),
    "raisedById" TEXT,
    "raisedByName" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EotClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EotClaim_projectId_idx" ON "EotClaim"("projectId");

-- AddForeignKey
ALTER TABLE "EotClaim" ADD CONSTRAINT "EotClaim_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EotClaim" ADD CONSTRAINT "EotClaim_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
