import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const globalDb = globalThis as unknown as { db?: PrismaClient };
export function db() {
  if (!process.env.DATABASE_URL)
    throw new Error(
      "Database is not configured. Set DATABASE_URL and run migrations and the location seed.",
    );
  return (globalDb.db ??= new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      // The isolated PGlite socket fixture shares one PostgreSQL backend.
      ...(process.env.JIBONDROP_TEST_BUILD === "1" ? { max: 1 } : {}),
    }),
  }));
}
