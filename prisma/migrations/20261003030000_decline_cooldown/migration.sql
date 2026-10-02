UPDATE "ContactRequest" SET "expiresAt" = "updatedAt" + INTERVAL '24 hours' WHERE "status" = 'DECLINED' AND "expiresAt" IS NULL;
