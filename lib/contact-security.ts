import { z } from "zod";
import { db } from "./db";
import { getAuth } from "./auth";
import { rateLimit, requestIp } from "./security";
import { contactLimits } from "./contact-policy";
export class ContactError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function contactUser(req: Request) {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) throw new ContactError("Log in to request donor contact.", 401);
  const user = await db().user.findUnique({
    where: { id: session.user.id },
    select: { id: true, suspended: true },
  });
  if (!user || user.suspended)
    throw new ContactError("Contact access is unavailable.", 403);
  return user;
}
export async function limitContact(req: Request, userId: string) {
  const ip = requestIp(req);
  await rateLimit(
    "contact-account-hour:" + userId,
    contactLimits.accountHourly,
    3600,
  );
  await rateLimit("contact-ip-hour:" + ip, contactLimits.ipHourly, 3600);
  await rateLimit(
    "contact-account-day:" + userId,
    contactLimits.accountDaily,
    86400,
  );
  await rateLimit("contact-ip-day:" + ip, contactLimits.ipDaily, 86400);
}
export function contactFailure(error: unknown) {
  if (error instanceof ContactError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof z.ZodError)
    return Response.json(
      { error: "Check the request details and try again." },
      { status: 400 },
    );
  if (error instanceof Error && error.message.startsWith("Too many requests."))
    return Response.json({ error: error.message }, { status: 429 });
  if (
    error instanceof Error &&
    error.message === "Request origin is not allowed."
  )
    return Response.json({ error: error.message }, { status: 403 });
  console.error("Contact service failed", error);
  return Response.json(
    { error: "Contact service is unavailable. Please try again later." },
    { status: 500 },
  );
}
export const contactInput = z.object({
  publicId: z.string().uuid(),
  intent: z.enum(["request", "reveal"]).default("request"),
  message: z.string().trim().min(10).max(500).optional(),
});
