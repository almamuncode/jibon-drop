import { db } from "@/lib/db";
import { published } from "@/lib/public";
import { checkOrigin, secretHash } from "@/lib/security";
import { approvalValid, contactStatus } from "@/lib/contact-policy";
import {
  ContactError,
  contactFailure,
  contactInput,
  contactUser,
  limitContact,
} from "@/lib/contact-security";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const user = await contactUser(req);
    const donor = await db().donor.findFirst({
      where: {
        ...published,
        sharePhone: true,
        publicId: new URL(req.url).searchParams.get("publicId") || "",
      },
      select: { id: true, userId: true },
    });
    if (!donor)
      throw new ContactError(
        "This donor is not accepting contact requests.",
        404,
      );
    if (donor.userId === user.id)
      throw new ContactError("This is your own donor profile.");
    const request = await db().contactRequest.findUnique({
      where: {
        donorId_requesterId: { donorId: donor.id, requesterId: user.id },
      },
      select: { id: true, status: true, expiresAt: true },
    });
    return Response.json(
      request
        ? { ...request, status: contactStatus(request) }
        : { status: "NONE" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return contactFailure(error);
  }
}
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const user = await contactUser(req);
    const body = contactInput.parse(await req.json());
    await limitContact(req, user.id);
    const result = await db().$transaction(async (tx) => {
      // All grants, disclosures and profile privacy changes serialize on this row.
      const rows = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM "Donor" WHERE "publicId"=${body.publicId} FOR UPDATE`;
      if (!rows.length) throw new ContactError("Contact unavailable.", 404);
      const donor = await tx.donor.findFirst({
        where: { ...published, sharePhone: true, id: rows[0].id },
      });
      if (!donor || !donor.phone)
        throw new ContactError(
          "This donor is not accepting contact requests.",
          404,
        );
      if (donor.userId === user.id)
        throw new ContactError("This is your own donor profile.");
      const where = {
        donorId_requesterId: { donorId: donor.id, requesterId: user.id },
      };
      const existing = await tx.contactRequest.findUnique({ where });
      if (body.intent === "reveal") {
        if (!existing || !approvalValid(existing, secretHash(donor.phone)))
          throw new ContactError(
            "The donor must approve your request before you can see the number.",
            403,
          );
        return {
          phone: donor.phone,
          id: existing.id,
          status: "APPROVED",
          expiresAt: existing.expiresAt,
        };
      }
      if (existing && contactStatus(existing) !== "EXPIRED")
        return {
          id: existing.id,
          status: existing.status,
          expiresAt: existing.expiresAt,
        };
      if (!body.message)
        throw new ContactError("Explain your request in 10–500 characters.");
      const request = await tx.contactRequest.upsert({
        where,
        create: {
          donorId: donor.id,
          requesterId: user.id,
          message: body.message,
        },
        update: {
          message: body.message,
          status: "PENDING",
          phoneHash: null,
          expiresAt: null,
        },
      });
      return { id: request.id, status: "PENDING", expiresAt: null };
    });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return contactFailure(error);
  }
}
