-- AlterTable
ALTER TABLE "MeetingMinutes" ADD COLUMN "title" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "meetingMinutesId" TEXT;

-- CreateIndex
CREATE INDEX "Task_meetingMinutesId_idx" ON "Task"("meetingMinutesId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_meetingMinutesId_fkey" FOREIGN KEY ("meetingMinutesId") REFERENCES "MeetingMinutes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
