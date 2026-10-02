import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { put, del } from "@vercel/blob";
import { db } from "@/lib/db";
import {
  checkOrigin,
  createSession,
  hash,
  sessionToken,
  rateLimit,
  requestIp,
  requireDonor,
  secretHash,
} from "@/lib/security";
import {
  donationSchema,
  normalizePhone,
  profileSchema,
  mockEnabled,
} from "@/lib/validation";
import { sendOtp } from "@/lib/sms";
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
      "otp/send": ["POST"],
      "otp/verify": ["POST"],
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
    mockEnabled();
    if (action === "otp/send") {
      const body = await req.json();
      const phone = normalizePhone(String(body.phone));
      const purpose = body.purpose === "change" ? "change" : "login";
      const donor = purpose === "change" ? await requireDonor() : null;
      await rateLimit("otp-ip:" + requestIp(req), 10, 3600);
      await rateLimit("otp-phone:" + phone, 5, 3600);
      const code = String(randomInt(100000, 1000000));
      const claimed = await db().$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${phone}))`;
        const old = await tx.otp.findUnique({ where: { phone } });
        if (old && Date.now() - old.sentAt.getTime() < 60000)
          throw new Error("Wait 60 seconds before requesting another code.");
        return tx.otp.upsert({
          where: { phone },
          create: {
            phone,
            codeHash: secretHash(phone + code),
            sentAt: new Date(),
            expiresAt: new Date(Date.now() + 300000),
            purpose,
            donorId: donor?.id,
          },
          update: {
            codeHash: secretHash(phone + code),
            sentAt: new Date(),
            expiresAt: new Date(Date.now() + 300000),
            attempts: 0,
            purpose,
            donorId: donor?.id || null,
          },
        });
      });
      try {
        return NextResponse.json(await sendOtp(phone, code));
      } catch (e) {
        await db().otp.deleteMany({
          where: { phone, codeHash: claimed.codeHash },
        });
        throw e;
      }
    }
    if (action === "otp/verify") {
      const body = await req.json();
      const phone = normalizePhone(String(body.phone));
      await rateLimit("verify:" + requestIp(req), 30, 3600);
      const changeDonor =
        body.purpose === "change" ? await requireDonor() : null;
      const result = await db().$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${phone}))`;
        const otp = await tx.otp.findUnique({ where: { phone } });
        if (
          !otp ||
          otp.expiresAt < new Date() ||
          otp.attempts >= 5 ||
          otp.purpose !== (changeDonor ? "change" : "login") ||
          (changeDonor && otp.donorId !== changeDonor.id)
        )
          return null;
        await tx.otp.update({
          where: { phone },
          data: { attempts: { increment: 1 } },
        });
        if (
          !/^\d{6}$/.test(String(body.code)) ||
          otp.codeHash !== secretHash(phone + body.code)
        )
          return null;
        await tx.otp.delete({ where: { phone } });
        if (changeDonor) {
          const existing = await tx.donor.findUnique({ where: { phone } });
          if (existing && existing.id !== changeDonor.id)
            throw new Error("This number is already registered.");
          await tx.session.deleteMany({ where: { donorId: changeDonor.id } });
          return tx.donor.update({
            where: { id: changeDonor.id },
            data: { phone, phoneVerifiedAt: new Date() },
          });
        }
        return tx.donor.upsert({
          where: { phone },
          create: { phone, phoneVerifiedAt: new Date() },
          update: { phoneVerifiedAt: new Date() },
        });
      });
      if (!result)
        throw new Error(
          "Invalid or expired code. Request a new code if needed.",
        );
      await createSession(result.id);
      return NextResponse.json({
        redirect: result.name ? "/dashboard" : "/dashboard/profile",
      });
    }
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
    if (action === "logout") {
      const token = await sessionToken();
      if (token)
        await db().session.deleteMany({ where: { tokenHash: hash(token) } });
      (await cookies()).delete("jd_session");
      return NextResponse.json({ ok: true });
    }
    if (action === "status") {
      const body = await req.json();
      if (
        typeof body.available !== "boolean" ||
        typeof body.visible !== "boolean"
      )
        throw new Error("Invalid status.");
      if (
        body.visible &&
        (!donor.consentAt || !donor.name || !donor.bloodGroup)
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
      await db().donor.update({
        where: { id: donor.id },
        data: {
          ...data,
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
        await tx.otp.deleteMany({
          where: { OR: [{ phone: donor.phone }, { donorId: donor.id }] },
        });
        await tx.donor.delete({ where: { id: donor.id } });
      });
      (await cookies()).delete("jd_session");
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
