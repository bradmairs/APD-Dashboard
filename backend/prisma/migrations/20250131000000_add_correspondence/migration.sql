-- CreateEnum
CREATE TYPE "CorrespondenceDirection" AS ENUM ('INCOMING', 'OUTGOING');

-- CreateEnum
CREATE TYPE "CorrespondenceStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "Correspondence" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "reference" TEXT,
    "direction" "CorrespondenceDirection" NOT NULL,
    "correspondent" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "summary" TEXT,
    "dateSent" TIMESTAMP(3) NOT NULL,
    "responseDueDate" TIMESTAMP(3),
    "status" "CorrespondenceStatus" NOT NULL DEFAULT 'OPEN',
    "dateClosed" TIMESTAMP(3),
    "notes" TEXT,
    "loggedById" TEXT,
    "loggedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Correspondence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Correspondence_projectId_idx" ON "Correspondence"("projectId");

-- AddForeignKey
ALTER TABLE "Correspondence" ADD CONSTRAINT "Correspondence_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Correspondence" ADD CONSTRAINT "Correspondence_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
