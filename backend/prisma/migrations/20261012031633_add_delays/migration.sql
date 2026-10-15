-- CreateEnum
CREATE TYPE "DelayStatus" AS ENUM ('ONGOING', 'RESOLVED');

-- CreateTable
CREATE TABLE "Delay" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "responsibleParty" TEXT,
    "criticalPath" BOOLEAN NOT NULL DEFAULT false,
    "dateStarted" TIMESTAMP(3) NOT NULL,
    "dateEnded" TIMESTAMP(3),
    "daysImpact" INTEGER,
    "status" "DelayStatus" NOT NULL DEFAULT 'ONGOING',
    "mitigation" TEXT,
    "eotReference" TEXT,
    "notes" TEXT,
    "raisedById" TEXT,
    "raisedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Delay_projectId_idx" ON "Delay"("projectId");

-- AddForeignKey
ALTER TABLE "Delay" ADD CONSTRAINT "Delay_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delay" ADD CONSTRAINT "Delay_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
