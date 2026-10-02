import { z } from "zod";
import { currentAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { checkOrigin } from "@/lib/security";
const schema = z.object({
  userId: z.string().min(1),
  action: z.enum([
    "hide",
    "restore",
    "suspend",
    "unsuspend",
    "promote",
    "demote",
    "delete-donation",
  ]),
  reason: z.string().trim().min(3).max(500),
  donationId: z.string().optional(),
});
export async function POST(request: Request) {
  const admin = await currentAdmin();
  if (!admin)
    return Response.json(
      { error: "Administrator access required." },
      { status: 403 },
    );
  try {
    checkOrigin(request);
    const body = schema.parse(await request.json());
    await db().$transaction(async (tx) => {
      // Serialize role changes to preserve an active administrator.
      await tx.$executeRaw`SELECT id FROM "User" WHERE role='ADMIN' ORDER BY id FOR UPDATE`;
      const user = await tx.user.findUniqueOrThrow({
        where: { id: body.userId },
        include: { donor: true },
      });
      if (
        (body.action === "suspend" || body.action === "demote") &&
        user.id === admin.id
      )
        throw new Error("You cannot suspend or remove your own admin role.");
      if (
        (body.action === "suspend" || body.action === "demote") &&
        user.role === "ADMIN" &&
        !user.suspended &&
        (await tx.user.count({ where: { role: "ADMIN", suspended: false } })) <=
          1
      )
        throw new Error("Keep at least one active administrator.");
      switch (body.action) {
        case "promote":
          if (user.suspended) throw new Error("Reactivate this user first.");
          await tx.user.update({
            where: { id: user.id },
            data: { role: "ADMIN" },
          });
          break;
        case "demote":
          await tx.user.update({
            where: { id: user.id },
            data: { role: "USER" },
          });
          break;
        case "suspend":
        case "unsuspend":
          await tx.user.update({
            where: { id: user.id },
            data: { suspended: body.action === "suspend" },
          });
          if (body.action === "suspend") {
            await tx.session.deleteMany({ where: { userId: user.id } });
            await tx.contactRequest.updateMany({
              where: {
                status: "APPROVED",
                OR: [{ requesterId: user.id }, { donor: { userId: user.id } }],
              },
              data: { status: "REVOKED", phoneHash: null, expiresAt: null },
            });
          }
          break;
        case "hide":
        case "restore":
          if (!user.donor) throw new Error("No donor profile exists.");
          await tx.donor.update({
            where: { id: user.donor.id },
            data: { moderationBlocked: body.action === "hide" },
          });
          if (body.action === "hide")
            await tx.contactRequest.updateMany({
              where: { donorId: user.donor.id, status: "APPROVED" },
              data: { status: "REVOKED", phoneHash: null, expiresAt: null },
            });
          break;
        case "delete-donation": {
          if (!user.donor || !body.donationId)
            throw new Error("Select a donation record.");
          await tx.$executeRaw`SELECT id FROM "Donor" WHERE id=${user.donor.id} FOR UPDATE`;
          const deleted = await tx.donation.deleteMany({
            where: { id: body.donationId, donorId: user.donor.id },
          });
          if (!deleted.count) throw new Error("Donation record not found.");
          const totals = await tx.donation.aggregate({
            where: { donorId: user.donor.id },
            _count: true,
            _max: { date: true },
          });
          await tx.donor.update({
            where: { id: user.donor.id },
            data: {
              donationCount: totals._count,
              lastDonation: totals._max.date,
            },
          });
          break;
        }
      }
      await tx.adminAudit.create({
        data: {
          actorId: admin.id,
          targetId: user.id,
          action: body.action,
          reason: body.reason,
        },
      });
    });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof z.ZodError
            ? "Enter a reason of 3–500 characters."
            : e instanceof Error && !e.message.includes("prisma")
              ? e.message
              : "Unable to update this user.",
      },
      { status: 400 },
    );
  }
}
