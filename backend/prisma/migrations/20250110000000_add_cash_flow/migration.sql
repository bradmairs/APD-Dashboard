-- CreateEnum
CREATE TYPE "CashFlowType" AS ENUM ('ACTUAL', 'FORECAST');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "contingency" DECIMAL(14,2);

-- CreateTable
CREATE TABLE "CashFlowEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "type" "CashFlowType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashFlowEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CashFlowEntry_projectId_month_type_key" ON "CashFlowEntry"("projectId", "month", "type");

-- CreateIndex
CREATE INDEX "CashFlowEntry_projectId_idx" ON "CashFlowEntry"("projectId");

-- AddForeignKey
ALTER TABLE "CashFlowEntry" ADD CONSTRAINT "CashFlowEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
