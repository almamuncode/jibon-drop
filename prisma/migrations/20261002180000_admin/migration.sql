ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'USER', ADD COLUMN "suspended" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Donor" ADD COLUMN "moderationBlocked" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "AdminAudit" ("id" TEXT NOT NULL, "actorId" TEXT NOT NULL, "targetId" TEXT NOT NULL, "action" TEXT NOT NULL, "reason" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AdminAudit_pkey" PRIMARY KEY ("id"));
CREATE INDEX "AdminAudit_createdAt_idx" ON "AdminAudit"("createdAt");
