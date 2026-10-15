-- CreateEnum
CREATE TYPE "ToolSuggestionCategory" AS ENUM ('NEW_FEATURE', 'IMPROVEMENT', 'BUG', 'OTHER');

-- CreateEnum
CREATE TYPE "ToolSuggestionStatus" AS ENUM ('OPEN', 'PLANNED', 'IN_PROGRESS', 'DONE', 'DECLINED');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "projectManagerId" TEXT;

-- CreateTable
CREATE TABLE "ToolSuggestion" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "ToolSuggestionCategory" NOT NULL DEFAULT 'IMPROVEMENT',
    "status" "ToolSuggestionStatus" NOT NULL DEFAULT 'OPEN',
    "response" TEXT,
    "createdById" TEXT,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ToolSuggestion_status_idx" ON "ToolSuggestion"("status");

-- CreateIndex
CREATE INDEX "Project_projectManagerId_idx" ON "Project"("projectManagerId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_projectManagerId_fkey" FOREIGN KEY ("projectManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolSuggestion" ADD CONSTRAINT "ToolSuggestion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Link existing projects to their manager's user account where the free-text
-- name matches exactly one active user (ignoring case and surrounding
-- spaces), and store the user's exact name. Anything ambiguous or unmatched is left unlinked and keeps its
-- text name, to be picked from the user list next time the project is edited.
UPDATE "Project" p
SET "projectManagerId" = m."userId", "projectManager" = m."name"
FROM (
  SELECT lower(btrim(u."name")) AS "key", min(u."id") AS "userId", min(u."name") AS "name"
  FROM "User" u
  WHERE u."active" = true
  GROUP BY lower(btrim(u."name"))
  HAVING count(*) = 1
) m
WHERE p."projectManager" IS NOT NULL
  AND lower(btrim(p."projectManager")) = m."key";
