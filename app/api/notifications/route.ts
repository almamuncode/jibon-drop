import { contactFailure, contactUser } from "@/lib/contact-security";
import { unreadCount } from "@/lib/notifications";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const user = await contactUser(req);
    return Response.json(
      { unread: await unreadCount(user.id) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return contactFailure(error);
  }
}
