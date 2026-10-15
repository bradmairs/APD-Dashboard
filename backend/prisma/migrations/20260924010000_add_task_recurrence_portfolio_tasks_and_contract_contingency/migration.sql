-- CreateEnum
CREATE TYPE "TaskRecurrence" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY');

-- AlterTable: Task.projectId becomes nullable so a task can be
-- portfolio-wide (relevant to every project) instead of scoped to one; a
-- NULL projectId never matches the existing FK constraint's check, so the
-- constraint itself doesn't need to change.
ALTER TABLE "Task" ALTER COLUMN "projectId" DROP NOT NULL;
ALTER TABLE "Task" ADD COLUMN "recurrence" "TaskRecurrence" NOT NULL DEFAULT 'NONE';

-- AlterTable: contingency moves from a single project-wide figure to a
-- per-contract one.
ALTER TABLE "ContractRecord" ADD COLUMN "contingency" DECIMAL(14,2);
ALTER TABLE "Project" DROP COLUMN "contingency";
