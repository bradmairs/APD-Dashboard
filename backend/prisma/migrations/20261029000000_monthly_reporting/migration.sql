-- AlterTable
ALTER TABLE "MonthlyReport" ADD COLUMN     "content" JSONB,
ADD COLUMN     "loggedAt" TIMESTAMP(3),
ADD COLUMN     "syncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "monthlyReportFileName" TEXT,
ADD COLUMN     "monthlyReportDriveId" TEXT,
ADD COLUMN     "monthlyReportItemId" TEXT,
ADD COLUMN     "monthlyReportWebUrl" TEXT,
ADD COLUMN     "monthlyReportStoredFile" TEXT;

-- CreateTable
CREATE TABLE "SharePointConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharePointConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SharePointConnection_userId_key" ON "SharePointConnection"("userId");

-- AddForeignKey
ALTER TABLE "SharePointConnection" ADD CONSTRAINT "SharePointConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
