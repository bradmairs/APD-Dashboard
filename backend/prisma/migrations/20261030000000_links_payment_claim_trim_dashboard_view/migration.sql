-- CreateEnum
CREATE TYPE "TrimLinkKind" AS ENUM ('TRIM', 'GENERAL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dashboardView" JSONB;

-- AlterTable
ALTER TABLE "PaymentClaim" ADD COLUMN     "trimLink" TEXT;

-- AlterTable
ALTER TABLE "TrimLink" ADD COLUMN     "kind" "TrimLinkKind" NOT NULL DEFAULT 'TRIM';

