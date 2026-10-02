import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { put, del, BlobAccessError, BlobError } from "@vercel/blob";
import { db } from "@/lib/db";
import { blobToken } from "@/lib/blob";
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
import { validateHierarchy } from "@/lib/public";
import { validateImage } from "@/lib/image";
export const dynamic = "force-dynamic";
async function cleanup(url: string) {
  await db().blobCleanup.upsert({
    where: { url },
    create: { url },
    update: {},
  });
  try {
    await del(url, { token: blobToken() });
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
      await db().$transaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM "Donor" WHERE id=${donor.id} FOR UPDATE`;
        const current = await tx.donor.findUniqueOrThrow({
          where: { id: donor.id },
        });
        if (
          body.visible &&
          (!current.consentAt ||
            !current.name ||
            !current.bloodGroup ||
            !current.phone)
        )
          throw new Error(
            "Complete your profile and consent before publishing.",
          );
        await tx.donor.update({
          where: { id: donor.id },
          data: { available: body.available, visible: body.visible },
        });
        if (!body.visible)
          await tx.contactRequest.updateMany({
            where: { donorId: donor.id, status: "APPROVED" },
            data: { status: "REVOKED", phoneHash: null, expiresAt: null },
          });
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
      await db().$transaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM "Donor" WHERE id=${donor.id} FOR UPDATE`;
        const current = await tx.donor.findUniqueOrThrow({
          where: { id: donor.id },
        });
        const sharePhone = parsed.sharePhone ?? current.sharePhone;
        const phonePublic = parsed.phonePublic ?? current.phonePublic;
        await tx.donor.update({
          where: { id: donor.id },
          data: {
            ...data,
            sharePhone,
            phonePublic,
            phone: canonical,
            phoneVerifiedAt:
              current.phone === canonical ? current.phoneVerifiedAt : null,
            consentAt: consent ? current.consentAt || new Date() : null,
          },
        });
        if (
          !sharePhone ||
          !consent ||
          !parsed.visible ||
          current.phone !== canonical
        )
          await tx.contactRequest.updateMany({
            where: { donorId: donor.id, status: "APPROVED" },
            data: { status: "REVOKED", phoneHash: null, expiresAt: null },
          });
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
      const token = blobToken();
      if (Number(req.headers.get("content-length")) > 120000)
        throw new Error("Photo too large.");
      const file = (await req.formData()).get("photo");
      if (!(file instanceof File) || file.size > 100000)
        throw new Error("Choose a photo under 100 KB.");
      const bytes = await validateImage(Buffer.from(await file.arrayBuffer()));
      const blob = await put(`profiles/${crypto.randomUUID()}.webp`, bytes, {
        token,
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
    if (
      e instanceof BlobError &&
      e.message.includes("Cannot use public access on a private store")
    ) {
      return NextResponse.json(
        {
          error:
            "Photo uploads need a public Blob store. The configured store is private. You can skip the photo while the site owner updates storage.",
        },
        { status: 503 },
      );
    }
    if (e instanceof BlobAccessError) {
      return NextResponse.json(
        {
          error:
            "Photo storage is unavailable. You can skip the photo and save your profile. The site owner needs to update the Vercel Blob token.",
        },
        { status: 503 },
      );
    }
    if (e instanceof ZodError) {
      return NextResponse.json(
        { error: e.issues.map((issue) => issue.message).join(" ") },
        { status: 400 },
      );
    }
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
