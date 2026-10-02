import { z } from "zod";
import { db } from "@/lib/db";
import { checkOrigin, secretHash } from "@/lib/security";
import { published } from "@/lib/public";
import { approvalLifetime } from "@/lib/contact-policy";
import {
  ContactError,
  contactFailure,
  contactUser,
} from "@/lib/contact-security";
const input = z.object({
  id: z.string().min(1),
  action: z.enum(["approve", "decline", "revoke"]),
});
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const user = await contactUser(req);
    const body = input.parse(await req.json());
    await db().$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM "Donor" WHERE "userId"=${user.id} FOR UPDATE`;
      if (!rows.length) throw new ContactError("Request unavailable.", 404);
      const request = await tx.contactRequest.findFirst({
        where: { id: body.id, donorId: rows[0].id },
        include: { requester: { select: { suspended: true } } },
      });
      if (!request) throw new ContactError("Request unavailable.", 404);
      if (body.action !== "revoke" && request.status !== "PENDING")
        throw new ContactError("This request has already been reviewed.", 409);
      let phoneHash: string | null = null;
      let expiresAt: Date | null = null;
      if (body.action === "approve") {
        const donor = await tx.donor.findFirst({
          where: { ...published, sharePhone: true, id: rows[0].id },
        });
        if (!donor?.phone || request.requester.suspended)
          throw new ContactError(
            "Enable phone sharing on your published profile before approving.",
          );
        phoneHash = secretHash(donor.phone);
        expiresAt = new Date(Date.now() + approvalLifetime);
      }
      await tx.contactRequest.update({
        where: { id: request.id },
        data: {
          status:
            body.action === "approve"
              ? "APPROVED"
              : body.action === "decline"
                ? "DECLINED"
                : "REVOKED",
          phoneHash,
          expiresAt,
        },
      });
    });
    return Response.json({ ok: true });
  } catch (error) {
    return contactFailure(error);
  }
}
