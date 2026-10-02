import { z } from "zod";
import { checkOrigin } from "@/lib/security";
import { contactFailure, contactUser } from "@/lib/contact-security";
import { markRead, unreadCount } from "@/lib/notifications";
const input = z.object({ id: z.string().min(1).max(64) });
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const user = await contactUser(req);
    const body = input.parse(await req.json());
    await markRead(user.id, body.id);
    return Response.json(
      { unread: await unreadCount(user.id) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return contactFailure(error);
  }
}
