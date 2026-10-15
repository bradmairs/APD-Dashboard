-- CreateEnum
CREATE TYPE "ArchiveItemType" AS ENUM ('ASSET', 'MEDIA', 'FILE');

-- AlterTable
ALTER TABLE "SiteVisitPhoto" ADD COLUMN     "archiveMediaId" TEXT,
ADD COLUMN     "archiveSyncedAt" TIMESTAMP(3),
ADD COLUMN     "archiveSyncError" TEXT;

-- CreateTable
CREATE TABLE "ArchiveLink" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "archiveType" "ArchiveItemType" NOT NULL,
    "archiveId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdById" TEXT,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchiveLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArchiveLink_projectId_idx" ON "ArchiveLink"("projectId");

-- AddForeignKey
ALTER TABLE "ArchiveLink" ADD CONSTRAINT "ArchiveLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchiveLink" ADD CONSTRAINT "ArchiveLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
