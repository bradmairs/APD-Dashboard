-- CreateEnum
CREATE TYPE "TenderMethod" AS ENUM ('OPEN', 'SELECTIVE', 'DIRECT_ENGAGE', 'EXPRESSION_OF_INTEREST');

-- CreateEnum
CREATE TYPE "TenderStatus" AS ENUM ('PLANNED', 'ISSUED', 'EVALUATION', 'AWARDED', 'CANCELLED');

-- CreateTable
CREATE TABLE "TenderPackage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "packageNumber" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "method" "TenderMethod" NOT NULL DEFAULT 'OPEN',
    "status" "TenderStatus" NOT NULL DEFAULT 'PLANNED',
    "dateIssued" TIMESTAMP(3),
    "closingDate" TIMESTAMP(3),
    "submissionsReceived" INTEGER,
    "estimatedValue" DECIMAL(14,2),
    "awardedTo" TEXT,
    "awardedValue" DECIMAL(14,2),
    "dateAwarded" TIMESTAMP(3),
    "managedById" TEXT,
    "managedByName" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenderPackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenderPackage_projectId_idx" ON "TenderPackage"("projectId");

-- AddForeignKey
ALTER TABLE "TenderPackage" ADD CONSTRAINT "TenderPackage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenderPackage" ADD CONSTRAINT "TenderPackage_managedById_fkey" FOREIGN KEY ("managedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
