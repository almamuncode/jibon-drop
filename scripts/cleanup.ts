import "dotenv/config";
import { del } from "@vercel/blob";
import { db } from "../lib/db";
import { blobToken } from "../lib/blob";
async function main() {
  for (const item of await db().blobCleanup.findMany({ take: 100 })) {
    try {
      await del(item.url, { token: blobToken() });
      await db().blobCleanup.delete({ where: { id: item.id } });
    } catch {
      console.error("Storage cleanup pending:", item.id);
    }
  }
  await db().session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await db().verification.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  await db().rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } });
  await db().$disconnect();
}
main();
