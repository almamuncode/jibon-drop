import { registrationSchema } from "@/lib/validation";
import { getAuth } from "@/lib/auth";
import { checkOrigin, rateLimit, requestIp } from "@/lib/security";
export const dynamic = "force-dynamic";
async function handle(req: Request) {
  try {
    if (req.method === "POST") {
      checkOrigin(req);
      await rateLimit("auth-ip:" + requestIp(req), 30, 300);
      const body = await req
        .clone()
        .json()
        .catch(() => ({}));
      const identifier = body.email || body.username;
      if (typeof identifier === "string")
        await rateLimit(
          "auth-account:" + identifier.trim().toLowerCase(),
          10,
          300,
        );
    }
    const path = new URL(req.url).pathname;
    // Account identity changes/recovery require verified email delivery. Keep them disabled until configured.
    if (
      [
        "/delete-user",
        "/change-email",
        "/request-password-reset",
        "/reset-password",
        "/link-social",
        "/link-account",
      ].some((p) => path.endsWith(p))
    )
      return Response.json(
        { error: "This account action is not available." },
        { status: 403 },
      );
    if (path.endsWith("/sign-up/email") && req.method === "POST") {
      const parsed = registrationSchema.safeParse(await req.clone().json());
      if (!parsed.success)
        return Response.json(
          {
            message:
              "Enter a name, valid email, username (3–30 letters/numbers/underscores) and password (10–128 characters).",
          },
          { status: 400 },
        );
      const headers = new Headers(req.headers);
      headers.delete("content-length");
      req = new Request(req, { headers, body: JSON.stringify(parsed.data) });
    }
    return await getAuth().handler(req);
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    return Response.json(
      {
        error:
          message.startsWith("Set ") ||
          message.startsWith("Database is not configured")
            ? message
            : "Unable to authenticate. Check your details or try again later.",
      },
      { status: 400 },
    );
  }
}
export const GET = handle;
export const POST = handle;
