-- AlterTable
ALTER TABLE "ActionItem" ADD COLUMN     "meetingMinutesId" TEXT;

-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN     "meetingMinutesId" TEXT;

-- CreateIndex
CREATE INDEX "ActionItem_meetingMinutesId_idx" ON "ActionItem"("meetingMinutesId");

-- CreateIndex
CREATE INDEX "Attachment_meetingMinutesId_idx" ON "Attachment"("meetingMinutesId");

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_meetingMinutesId_fkey" FOREIGN KEY ("meetingMinutesId") REFERENCES "MeetingMinutes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_meetingMinutesId_fkey" FOREIGN KEY ("meetingMinutesId") REFERENCES "MeetingMinutes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
