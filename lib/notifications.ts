import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { sendAccountEmail } from "./email";

export const notificationLimits = {
  maxAttempts: 1,
  lockSeconds: 120,
  emailsPerHour: 5,
};

export function requestLink(contactRequestId: string) {
  const origin = process.env.BETTER_AUTH_URL?.replace(/\/+$/, "");
  if (!origin) throw new Error("Set BETTER_AUTH_URL to the website origin.");
  return `${origin}/dashboard/requests?request=${encodeURIComponent(contactRequestId)}`;
}

// Re-requests only happen after an approval expired, so they re-arm the same row.
export function createNotification(
  tx: Prisma.TransactionClient,
  userId: string,
  contactRequestId: string,
) {
  return tx.notification.upsert({
    where: { contactRequestId },
    create: { userId, contactRequestId },
    update: {
      readAt: null,
      emailStatus: "PENDING",
      emailAttempts: 0,
      emailLockedUntil: null,
      emailNextAttemptAt: null,
      emailSentAt: null,
      emailError: null,
      createdAt: new Date(),
    },
    select: { id: true },
  });
}

export function unreadCount(userId: string) {
  return db().notification.count({ where: { userId, readAt: null } });
}

export async function markRead(userId: string, id: string) {
  const result = await db().notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}

export async function markRequestRead(
  userId: string,
  contactRequestId: string,
) {
  const result = await db().notification.updateMany({
    where: { contactRequestId, userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}

export async function unreadRequestIds(userId: string) {
  const rows = await db().notification.findMany({
    where: { userId, readAt: null },
    select: { contactRequestId: true },
  });
  return new Set(rows.map((row) => row.contactRequestId));
}

export type Delivery = "sent" | "failed" | "skipped" | "unavailable";

// Never throws: a delivery problem must not affect the saved request.
export async function deliverNotification(id: string): Promise<Delivery> {
  try {
    const client = db();
    // The atomic claim guarantees one sender per attempt and bounds retries.
    const now = new Date();
    const lockedUntil = new Date(
      now.getTime() + notificationLimits.lockSeconds * 1000,
    );
    const claimed = await client.$queryRaw<
      { userId: string; contactRequestId: string }[]
    >`
      UPDATE "Notification" SET "emailAttempts"="emailAttempts"+1,
        "emailLockedUntil"=${lockedUntil}, "updatedAt"=${now}
      WHERE id=${id} AND "emailStatus" = 'PENDING'
        AND "emailAttempts"<${notificationLimits.maxAttempts}
        AND ("emailNextAttemptAt" IS NULL OR "emailNextAttemptAt"<=${now})
        AND ("emailLockedUntil" IS NULL OR "emailLockedUntil"<=${now})
      RETURNING "userId","contactRequestId"`;
    if (!claimed.length) return "unavailable";
    const { userId, contactRequestId } = claimed[0];
    const recent = await client.notification.count({
      where: {
        userId,
        emailSentAt: { gt: new Date(Date.now() - 3600 * 1000) },
      },
    });
    if (recent >= notificationLimits.emailsPerHour) {
      await client.notification.update({
        where: { id },
        data: {
          emailStatus: "SKIPPED",
          emailLockedUntil: null,
          emailError: "Hourly email limit reached.",
        },
      });
      return "skipped";
    }
    try {
      const user = await client.user.findUnique({
        where: { id: userId },
        select: { email: true, suspended: true },
      });
      if (!user || user.suspended) throw new Error("Recipient unavailable.");
      await sendAccountEmail(
        user.email,
        "New contact request on JibonDrop",
        [
          "Someone signed in to JibonDrop has sent you a contact request.",
          "Open it to review and approve or decline:",
          requestLink(contactRequestId),
          "",
          "You are receiving this because you are a donor on JibonDrop. No phone number is shared until you approve.",
        ].join("\n"),
        "We couldn’t send the notification email.",
      );
    } catch (error) {
      console.error("Notification email failed", id, error);
      await client.notification.update({
        where: { id },
        data: {
          emailStatus: "FAILED",
          emailLockedUntil: null,
          emailError:
            error instanceof Error ? error.message.slice(0, 200) : "Failed",
        },
      });
      return "failed";
    }
    await client.notification.update({
      where: { id },
      data: {
        emailStatus: "SENT",
        emailSentAt: new Date(),
        emailLockedUntil: null,
        emailNextAttemptAt: null,
        emailError: null,
      },
    });
    return "sent";
  } catch (error) {
    console.error("Notification delivery unavailable", id, error);
    return "failed";
  }
}
