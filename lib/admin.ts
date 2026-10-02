import { headers } from "next/headers";
import { getAuth } from "./auth";
import { db } from "./db";
export async function currentAdmin() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;
  return db().user.findFirst({
    where: { id: session.user.id, role: "ADMIN", suspended: false },
    select: { id: true, name: true },
  });
}
