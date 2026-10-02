import "dotenv/config";
import { db } from "../lib/db";
import { loadLocations } from "./locations";
async function main() {
  const rows = loadLocations();
  for (const row of rows)
    await db().location.upsert({
      where: { id: row.id },
      create: row,
      update: row,
    });
  console.log(`Imported ${rows.length} linked locations. No donors seeded.`);
  await db().$disconnect();
}
main().catch(() => {
  console.error(
    "Seed failed. Check database configuration and location validation.",
  );
  process.exit(1);
});
