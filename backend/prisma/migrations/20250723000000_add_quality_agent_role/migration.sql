-- AlterEnum: Add QUALITY_AGENT to UserRole enum
ALTER TYPE "UserRole" ADD VALUE 'QUALITY_AGENT';

-- CreateEnum: QualityReviewStage
CREATE TYPE "QualityReviewStage" AS ENUM ('INITIAL_REVIEW', 'INSPECTION', 'DECISION', 'RESOLUTION');

-- CreateEnum: QualitySeverity
CREATE TYPE "QualitySeverity" AS ENUM ('MINOR', 'MODERATE', 'MAJOR', 'CRITICAL');

-- CreateEnum: QualityDecision
CREATE TYPE "QualityDecision" AS ENUM ('APPROVED', 'REJECTED', 'ESCALATED', 'PENDING');

-- AlterTable: Add quality fields to tickets table
ALTER TABLE "tickets" ADD COLUMN "qualityReviewStage" "QualityReviewStage",
ADD COLUMN "qualitySeverity" "QualitySeverity",
ADD COLUMN "qualityDecision" "QualityDecision",
ADD COLUMN "qualityReviewerId" TEXT,
ADD COLUMN "qualityReviewedAt" TIMESTAMP(3),
ADD COLUMN "qualityMetrics" JSONB,
ADD COLUMN "qualityNotes" TEXT;

-- CreateIndex: Add indexes for quality fields
CREATE INDEX "tickets_qualityReviewStage_idx" ON "tickets"("qualityReviewStage");
CREATE INDEX "tickets_qualitySeverity_idx" ON "tickets"("qualitySeverity");
CREATE INDEX "tickets_qualityDecision_idx" ON "tickets"("qualityDecision");
CREATE INDEX "tickets_qualityReviewerId_idx" ON "tickets"("qualityReviewerId");

-- AddForeignKey: Add foreign key for quality reviewer
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_qualityReviewerId_fkey" FOREIGN KEY ("qualityReviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;