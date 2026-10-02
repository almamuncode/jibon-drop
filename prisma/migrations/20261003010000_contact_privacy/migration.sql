ALTER TABLE "Donor" ADD COLUMN "sharePhone" BOOLEAN NOT NULL DEFAULT true;
CREATE TABLE "ContactRequest" (
 "id" TEXT NOT NULL,
 "donorId" TEXT NOT NULL,
 "requesterId" TEXT NOT NULL,
 "message" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PENDING',
 "phoneHash" TEXT,
 "expiresAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ContactRequest_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "ContactRequest_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Donor"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "ContactRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ContactRequest_donorId_requesterId_key" ON "ContactRequest"("donorId", "requesterId");
CREATE INDEX "ContactRequest_donorId_status_createdAt_idx" ON "ContactRequest"("donorId", "status", "createdAt");
CREATE INDEX "ContactRequest_requesterId_createdAt_idx" ON "ContactRequest"("requesterId", "createdAt");
CREATE TABLE "AbuseReport" (
 "id" TEXT NOT NULL,
 "contactRequestId" TEXT,
 "reporterId" TEXT NOT NULL,
 "targetUserId" TEXT NOT NULL,
 "reason" TEXT NOT NULL,
 "details" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'OPEN',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "resolvedAt" TIMESTAMP(3),
 CONSTRAINT "AbuseReport_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "AbuseReport_contactRequestId_fkey" FOREIGN KEY ("contactRequestId") REFERENCES "ContactRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 CONSTRAINT "AbuseReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "AbuseReport_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AbuseReport_reporterId_contactRequestId_key" ON "AbuseReport"("reporterId", "contactRequestId");
CREATE INDEX "AbuseReport_status_createdAt_idx" ON "AbuseReport"("status", "createdAt");
