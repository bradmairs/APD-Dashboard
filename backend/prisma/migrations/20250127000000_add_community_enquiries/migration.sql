-- CreateEnum
CREATE TYPE "EnquiryCategory" AS ENUM ('NOISE', 'TRAFFIC', 'DUST', 'ACCESS', 'OTHER');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "CommunityEnquiry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "reference" TEXT,
    "category" "EnquiryCategory" NOT NULL,
    "source" TEXT,
    "contactName" TEXT,
    "contactDetails" TEXT,
    "description" TEXT NOT NULL,
    "dateReceived" TIMESTAMP(3) NOT NULL,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'OPEN',
    "assignedTo" TEXT,
    "resolution" TEXT,
    "dateResolved" TIMESTAMP(3),
    "loggedById" TEXT,
    "loggedByName" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunityEnquiry_projectId_idx" ON "CommunityEnquiry"("projectId");

-- AddForeignKey
ALTER TABLE "CommunityEnquiry" ADD CONSTRAINT "CommunityEnquiry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityEnquiry" ADD CONSTRAINT "CommunityEnquiry_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
