import { createHash, createHmac } from "node:crypto";
import { headers } from "next/headers";
import { cache } from "react";
import { Prisma } from "@prisma/client";
import { getAuth } from "./auth";
import { db } from "./db";
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export function secretHash(s: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Set AUTH_SECRET to at least 32 random characters.");
  return createHmac("sha256", secret).update(s).digest("hex");
}
// Share initialization between the dashboard layout and page in each render.
export const currentDonor = cache(async () => {
  if (!(await headers()).get("cookie")) return null;
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;
  const user = await db().user.findUnique({
    where: { id: session.user.id },
    select: { suspended: true },
  });
  if (!user || user.suspended) return null;
  try {
    return await db().donor.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, name: session.user.name },
      update: {},
    });
  } catch (error) {
    // Another request may create this user's profile during the same sign-in.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const donor = await db().donor.findUnique({
        where: { userId: session.user.id },
      });
      if (donor) return donor;
    }
    throw error;
  }
});
export async function requireDonor() {
  const donor = await currentDonor();
  if (!donor) throw new Error("Please log in to continue.");
  return donor;
}
export async function rateLimit(key: string, max: number, seconds: number) {
  const safe = secretHash(key);
  const rows = await db().$queryRaw<
    { count: number }[]
  >`INSERT INTO "RateLimit" (key,count,"resetAt") VALUES (${safe},1, NOW()+${seconds}*INTERVAL '1 second') ON CONFLICT (key) DO UPDATE SET count=CASE WHEN "RateLimit"."resetAt"<=NOW() THEN 1 ELSE "RateLimit".count+1 END,"resetAt"=CASE WHEN "RateLimit"."resetAt"<=NOW() THEN NOW()+${seconds}*INTERVAL '1 second' ELSE "RateLimit"."resetAt" END RETURNING count`;
  if (rows[0].count > max)
    throw new Error("Too many requests. Please try again later.");
}
export function requestIp(req: Request) {
  return process.env.VERCEL
    ? req.headers.get("x-vercel-forwarded-for")?.split(",")[0] || "unknown"
    : "local";
}
export function checkOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const expected = process.env.APP_ORIGIN;
  if (!origin) throw new Error("Request origin is not allowed.");
  const parsed = new URL(origin);
  if (
    expected
      ? parsed.origin !== new URL(expected).origin
      : parsed.host !== req.headers.get("host")
  )
    throw new Error("Request origin is not allowed.");
}
