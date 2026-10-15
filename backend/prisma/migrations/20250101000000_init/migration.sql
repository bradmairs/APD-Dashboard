-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'DESIGN', 'TENDER', 'CONSTRUCTION', 'DEFECTS_LIABILITY', 'COMPLETE', 'ON_HOLD', 'CANCELLED');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "assetType" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "projectManager" TEXT,
    "location" TEXT,
    "contractor" TEXT,
    "budget" DECIMAL(14,2),
    "contractValue" DECIMAL(14,2),
    "startDate" TIMESTAMP(3),
    "targetCompletionDate" TIMESTAMP(3),
    "actualCompletionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);
