import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import fs from "node:fs";
import { loadLocations } from "./locations";
async function main() {
  const db = new PGlite();
  for (const dir of fs
    .readdirSync("prisma/migrations")
    .filter((name) => /^\d/.test(name))
    .sort())
    await db.exec(
      fs.readFileSync(`prisma/migrations/${dir}/migration.sql`, "utf8"),
    );
  for (const r of loadLocations())
    await db.query(
      'INSERT INTO "Location" (id,name,"bnName",type,"parentId",source) VALUES ($1,$2,$3,$4,$5,$6)',
      [r.id, r.name, r.bnName, r.type, r.parentId, r.source],
    );
  const server = new PGLiteSocketServer({
    db,
    port: 55432,
    host: "127.0.0.1",
    maxConnections: 20,
  });
  await server.start();
  console.log(
    "Isolated ephemeral test PostgreSQL listening on 55432. No production data used.",
  );
}
main();
