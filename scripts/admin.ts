import "dotenv/config";
import { db } from "../lib/db";
async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email)
    throw new Error("Usage: npm run admin:grant -- your-account@example.com");
  const user = await db().user.findUnique({
    where: { email },
    select: { id: true, suspended: true },
  });
  if (!user)
    throw new Error("Register this account before granting admin access.");
  if (user.suspended) throw new Error("Reactivate this account first.");
  await db().$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
    await tx.adminAudit.create({
      data: {
        actorId: "local-admin-command",
        targetId: user.id,
        action: "promote",
        reason: "Admin role granted by database operator.",
      },
    });
  });
  console.log("Administrator access granted.");
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db().$disconnect());
