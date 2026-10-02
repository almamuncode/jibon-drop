import { createHash, createHmac, randomBytes } from "node:crypto";
import { sealData, unsealData } from "iron-session";
import { cookies } from "next/headers";
import { db } from "./db";
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export function secretHash(s: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Set AUTH_SECRET to at least 32 random characters.");
  return createHmac("sha256", secret).update(s).digest("hex");
}
function authSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Set AUTH_SECRET to at least 32 random characters.");
  return secret;
}
export async function sessionToken() {
  const sealed = (await cookies()).get("jd_session")?.value;
  if (!sealed) return null;
  const value = await unsealData<{ token?: string }>(sealed, {
    password: authSecret(),
    ttl: 30 * 86400,
  });
  return value.token || null;
}
export async function currentDonor() {
  const token = await sessionToken();
  if (!token) return null;
  const session = await db().session.findUnique({
    where: { tokenHash: hash(token) },
    include: { donor: true },
  });
  return session && session.expiresAt > new Date() ? session.donor : null;
}
export async function requireDonor() {
  const donor = await currentDonor();
  if (!donor) throw new Error("Please log in to continue.");
  return donor;
}
export async function createSession(donorId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 86400000);
  await db().session.create({
    data: { tokenHash: hash(token), donorId, expiresAt },
  });
  const sealed = await sealData(
    { token },
    { password: authSecret(), ttl: 30 * 86400 },
  );
  (await cookies()).set("jd_session", sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
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
