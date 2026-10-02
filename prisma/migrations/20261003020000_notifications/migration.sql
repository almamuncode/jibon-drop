CREATE TABLE "Notification" (
 "id" TEXT NOT NULL,
 "userId" TEXT NOT NULL,
 "contactRequestId" TEXT NOT NULL,
 "type" TEXT NOT NULL DEFAULT 'CONTACT_REQUEST',
 "readAt" TIMESTAMP(3),
 "emailStatus" TEXT NOT NULL DEFAULT 'PENDING',
 "emailAttempts" INTEGER NOT NULL DEFAULT 0,
 "emailLockedUntil" TIMESTAMP(3),
 "emailNextAttemptAt" TIMESTAMP(3),
 "emailSentAt" TIMESTAMP(3),
 "emailError" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "Notification_contactRequestId_fkey" FOREIGN KEY ("contactRequestId") REFERENCES "ContactRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Notification_contactRequestId_key" ON "Notification"("contactRequestId");
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
CREATE INDEX "Notification_emailStatus_emailNextAttemptAt_idx" ON "Notification"("emailStatus", "emailNextAttemptAt");
