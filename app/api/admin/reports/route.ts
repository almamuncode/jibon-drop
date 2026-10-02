import { z } from "zod";
import { db } from "@/lib/db";
import { currentAdmin } from "@/lib/admin";
import { checkOrigin } from "@/lib/security";
import { ContactError, contactFailure } from "@/lib/contact-security";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const admin = await currentAdmin();
    if (!admin) throw new ContactError("Administrator access required.", 403);
    const body = z
      .object({
        id: z.string().min(1),
        reason: z.string().trim().min(3).max(500),
      })
      .parse(await req.json());
    await db().$transaction(async (tx) => {
      const report = await tx.abuseReport.findUnique({
        where: { id: body.id },
      });
      if (!report) throw new ContactError("Report unavailable.", 404);
      const changed = await tx.abuseReport.updateMany({
        where: { id: body.id, status: "OPEN" },
        data: { status: "RESOLVED", resolvedAt: new Date() },
      });
      if (!changed.count)
        throw new ContactError("This report has already been reviewed.", 409);
      await tx.adminAudit.create({
        data: {
          actorId: admin.id,
          targetId: report.targetUserId,
          action: "resolve-report",
          reason: body.reason,
        },
      });
    });
    return Response.json({ ok: true });
  } catch (error) {
    return contactFailure(error);
  }
}
