import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { put, del } from "@vercel/blob";
import { db } from "@/lib/db";
import {
  checkOrigin,
  rateLimit,
  requestIp,
  requireDonor,
} from "@/lib/security";
import {
  donationSchema,
  normalizePhone,
  profileSchema,
} from "@/lib/validation";
import { published, validateHierarchy } from "@/lib/public";
import { validateImage } from "@/lib/image";
export const dynamic = "force-dynamic";
async function cleanup(url: string) {
  await db().blobCleanup.upsert({
    where: { url },
    create: { url },
    update: {},
  });
  try {
    await del(url);
    await db().blobCleanup.delete({ where: { url } });
  } catch {
    /* Persistent cleanup job retries failed deletions. */
  }
}
async function handle(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const path = (await params).path;
    const action = path.join("/");
    if (req.method === "GET" && action === "locations") {
      const parent = new URL(req.url).searchParams.get("parent");
      return NextResponse.json(
        await db().location.findMany({
          where: { parentId: parent || null },
          select: { id: true, name: true, bnName: true, type: true },
          orderBy: { name: "asc" },
        }),
      );
    }
    checkOrigin(req);
    const methods: Record<string, string[]> = {
      contact: ["POST"],
      logout: ["POST"],
      profile: ["POST"],
      status: ["PATCH"],
      donations: ["POST", "DELETE"],
      photo: ["POST", "DELETE"],
      account: ["DELETE"],
    };
    if (!methods[action]?.includes(req.method))
      return NextResponse.json(
        { error: "Method not allowed" },
        { status: 405 },
      );
    if (action === "contact") {
      const body = await req.json();
      await rateLimit("contact:" + requestIp(req), 20, 3600);
      const donor = await db().donor.findFirst({
        where: { ...published, publicId: String(body.publicId) },
        select: { phone: true },
      });
      if (!donor)
        return NextResponse.json(
          { error: "Contact unavailable." },
          { status: 404 },
        );
      return NextResponse.json(donor);
    }
    const donor = await requireDonor();
    if (action === "logout")
      return getAuth().api.signOut({
        headers: await headers(),
        asResponse: true,
      });
    if (action === "status") {
      const body = await req.json();
      if (
        typeof body.available !== "boolean" ||
        typeof body.visible !== "boolean"
      )
        throw new Error("Invalid status.");
      if (
        body.visible &&
        (!donor.consentAt || !donor.name || !donor.bloodGroup || !donor.phone)
      )
        throw new Error("Complete your profile and consent before publishing.");
      await db().donor.update({
        where: { id: donor.id },
        data: { available: body.available, visible: body.visible },
      });
      return NextResponse.json({ ok: true });
    }
    if (action === "profile") {
      const parsed = profileSchema.parse(await req.json());
      await validateHierarchy(parsed);
      if (!parsed.localityId && !parsed.fallbackArea)
        throw new Error(
          "Choose a locality or enter your private area fallback.",
        );
      const { consent, ...data } = parsed;
      const canonical = normalizePhone(parsed.phone);
      if (!donor.userId) throw new Error("Please log in again.");
      await db().donor.update({
        where: { id: donor.id },
        data: {
          ...data,
          phone: canonical,
          phoneVerifiedAt:
            donor.phone === canonical ? donor.phoneVerifiedAt : null,
          consentAt: consent ? donor.consentAt || new Date() : null,
        },
      });
      return NextResponse.json({ ok: true });
    }
    if (action === "donations") {
      const body = await req.json();
      await db().$transaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM "Donor" WHERE id=${donor.id} FOR UPDATE`;
        if (req.method === "DELETE") {
          await tx.donation.deleteMany({
            where: { id: String(body.id), donorId: donor.id },
          });
        } else {
          const data = donationSchema.parse(body);
          const fields = {
            date: new Date(data.date + "T00:00:00Z"),
            hospital: data.hospital || null,
            note: data.note || null,
          };
          if (body.id) {
            const updated = await tx.donation.updateMany({
              where: { id: String(body.id), donorId: donor.id },
              data: fields,
            });
            if (!updated.count) throw new Error("Record unavailable.");
          } else {
            await tx.donation.createMany({
              data: {
                ...fields,
                donorId: donor.id,
                submissionId: data.submissionId,
              },
              skipDuplicates: true,
            });
          }
        }
        const aggregate = await tx.donation.aggregate({
          where: { donorId: donor.id },
          _count: true,
          _max: { date: true },
        });
        await tx.donor.update({
          where: { id: donor.id },
          data: {
            donationCount: aggregate._count,
            lastDonation: aggregate._max.date,
          },
        });
      });
      return NextResponse.json({ ok: true });
    }
    if (action === "photo") {
      if (req.method === "DELETE") {
        await db().donor.update({
          where: { id: donor.id },
          data: { imageUrl: null },
        });
        if (donor.imageUrl) await cleanup(donor.imageUrl);
        return NextResponse.json({ ok: true });
      }
      if (!process.env.BLOB_READ_WRITE_TOKEN)
        throw new Error("Profile uploads require Vercel Blob configuration.");
      if (Number(req.headers.get("content-length")) > 120000)
        throw new Error("Photo too large.");
      const file = (await req.formData()).get("photo");
      if (!(file instanceof File) || file.size > 100000)
        throw new Error("Choose a photo under 100 KB.");
      const bytes = await validateImage(Buffer.from(await file.arrayBuffer()));
      const blob = await put(`profiles/${crypto.randomUUID()}.webp`, bytes, {
        access: "public",
        contentType: "image/webp",
        addRandomSuffix: true,
      });
      try {
        await db().donor.update({
          where: { id: donor.id },
          data: { imageUrl: blob.url },
        });
      } catch (e) {
        await cleanup(blob.url);
        throw e;
      }
      if (donor.imageUrl) await cleanup(donor.imageUrl);
      return NextResponse.json({ url: blob.url });
    }
    if (action === "account" && req.method === "DELETE") {
      const body = await req.json();
      if (body.confirm !== "DELETE") throw new Error("Type DELETE to confirm.");
      await db().$transaction(async (tx) => {
        if (donor.imageUrl)
          await tx.blobCleanup.upsert({
            where: { url: donor.imageUrl },
            create: { url: donor.imageUrl },
            update: {},
          });
        if (!donor.userId) throw new Error("Account unavailable.");
        await tx.user.delete({ where: { id: donor.userId } });
      });
      if (donor.imageUrl) await cleanup(donor.imageUrl);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Request failed";
    const safe =
      message.includes("Invalid `") || message.includes("Unique constraint")
        ? "Unable to save. Check your inputs or try again."
        : message;
    return NextResponse.json({ error: safe }, { status: 400 });
  }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
