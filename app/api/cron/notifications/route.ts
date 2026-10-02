import { timingSafeEqual } from "node:crypto";
import { retryNotifications } from "@/lib/notifications";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const given = Buffer.from(req.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
export async function GET(req: Request) {
  if (!authorized(req))
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  try {
    return Response.json(await retryNotifications());
  } catch (error) {
    console.error("Notification retry failed", error);
    return Response.json({ error: "Retry failed." }, { status: 500 });
  }
}
