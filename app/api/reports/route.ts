import { z } from "zod";
import { db } from "@/lib/db";
import { checkOrigin, rateLimit, requestIp } from "@/lib/security";
import {
  ContactError,
  contactFailure,
  contactUser,
} from "@/lib/contact-security";
const input = z.object({
  contactRequestId: z.string().min(1),
  reason: z.enum(["UNWANTED_CONTACT", "SPAM", "INAPPROPRIATE_BEHAVIOR"]),
  details: z.string().trim().min(10).max(1000),
});
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const user = await contactUser(req);
    const body = input.parse(await req.json());
    await rateLimit("reports-account:" + user.id, 5, 86400);
    await rateLimit("reports-ip:" + requestIp(req), 20, 86400);
    const request = await db().contactRequest.findUnique({
      where: { id: body.contactRequestId },
      include: { donor: { select: { userId: true } } },
    });
    if (
      !request ||
      (request.requesterId !== user.id && request.donor.userId !== user.id)
    )
      throw new ContactError("Request unavailable.", 404);
    const targetUserId =
      request.requesterId === user.id
        ? request.donor.userId
        : request.requesterId;
    if (!targetUserId || targetUserId === user.id)
      throw new ContactError("Report unavailable.", 404);
    await db().$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "Donor" WHERE id=${request.donorId} FOR UPDATE`;
      await tx.abuseReport.upsert({
        where: {
          reporterId_contactRequestId: {
            reporterId: user.id,
            contactRequestId: request.id,
          },
        },
        create: { ...body, reporterId: user.id, targetUserId },
        update: {},
      });
      // Reporting unwanted contact also blocks further disclosures for this pair.
      await tx.contactRequest.update({
        where: { id: request.id },
        data: { status: "REVOKED", phoneHash: null, expiresAt: null },
      });
    });
    return Response.json({ ok: true });
  } catch (error) {
    return contactFailure(error);
  }
}
