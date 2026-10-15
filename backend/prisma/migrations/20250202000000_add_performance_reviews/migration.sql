-- CreateTable
CREATE TABLE "PerformanceReview" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "revieweeName" TEXT NOT NULL,
    "reviewPeriod" TEXT,
    "reviewDate" TIMESTAMP(3) NOT NULL,
    "qualityRating" INTEGER NOT NULL,
    "safetyRating" INTEGER NOT NULL,
    "timelinessRating" INTEGER NOT NULL,
    "communicationRating" INTEGER NOT NULL,
    "comments" TEXT,
    "reviewedById" TEXT,
    "reviewedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PerformanceReview_projectId_idx" ON "PerformanceReview"("projectId");

-- AddForeignKey
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
