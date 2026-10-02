import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("../lib/email", () => ({
  sendAccountEmail: vi.fn(),
  emailConfigured: () => true,
}));
vi.mock("next/server", () => ({
  after: (task: () => Promise<unknown>) => void task(),
}));
vi.mock("../lib/auth", () => ({
  getAuth: () => ({
    api: {
      getSession: async ({ headers }: { headers: Headers }) => {
        const id = headers.get("x-test-user");
        return id ? { user: { id } } : null;
      },
    },
  }),
}));

let route: typeof import("../app/api/contact/route");
let client: ReturnType<typeof import("../lib/db").db>;
let pg: PGlite;
let server: PGLiteSocketServer;
let publicId = "";
const donorUser = "pv-donor";
const viewer = "pv-viewer";

beforeAll(async () => {
  pg = new PGlite();
  for (const dir of fs
    .readdirSync("prisma/migrations")
    .filter((name) => /^\d/.test(name))
    .sort())
    await pg.exec(
      fs.readFileSync(`prisma/migrations/${dir}/migration.sql`, "utf8"),
    );
  server = new PGLiteSocketServer({ db: pg, port: 55434, host: "127.0.0.1" });
  await server.start();
  process.env.DATABASE_URL = "postgresql://postgres@127.0.0.1:55434/postgres";
  process.env.JIBONDROP_TEST_BUILD = "1";
  process.env.AUTH_SECRET = "x".repeat(40);
  process.env.BETTER_AUTH_URL = "https://jibon.example/";
  client = (await import("../lib/db")).db();
  route = await import("../app/api/contact/route");
});
afterAll(async () => {
  await client?.$disconnect();
  await server?.stop();
  await pg?.close();
});
beforeEach(async () => {
  await client.$executeRawUnsafe(
    'TRUNCATE "Notification","ContactRequest","Donor","User","RateLimit" CASCADE',
  );
  for (const id of [donorUser, viewer])
    await client.user.create({
      data: { id, name: id, email: `${id}@example.com` },
    });
  publicId = (
    await client.donor.create({
      data: {
        userId: donorUser,
        name: "Donor",
        bloodGroup: "A+",
        phone: "+8801712345678",
        visible: true,
        consentAt: new Date(),
      },
    })
  ).publicId;
});

const reveal = (user: string | null) =>
  route.POST(
    new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        host: "localhost:3000",
        "content-type": "application/json",
        ...(user ? { "x-test-user": user } : {}),
      },
      body: JSON.stringify({ publicId, intent: "reveal" }),
    }),
  );
const status = (user: string | null) =>
  route.GET(
    new Request("http://localhost:3000/api/contact?publicId=" + publicId, {
      headers: user ? { "x-test-user": user } : {},
    }),
  );

describe("public phone numbers", () => {
  it("defaults to private and requires approval", async () => {
    expect((await client.donor.findFirstOrThrow()).phonePublic).toBe(false);
    expect((await reveal(viewer)).status).toBe(403);
  });

  it("reveals a public number only to signed-in users", async () => {
    await client.donor.updateMany({ data: { phonePublic: true } });
    expect((await reveal(null)).status).toBe(401);
    expect((await status(null)).status).toBe(401);
    expect((await (await status(viewer)).json()).status).toBe("PUBLIC");
    const ok = await reveal(viewer);
    expect(ok.status).toBe(200);
    expect((await ok.json()).phone).toBe("+8801712345678");
  });

  it("blocks suspended users and hidden or contact-disabled donors", async () => {
    await client.donor.updateMany({ data: { phonePublic: true } });
    await client.user.update({
      where: { id: viewer },
      data: { suspended: true },
    });
    expect((await reveal(viewer)).status).toBe(403);
    await client.user.update({
      where: { id: viewer },
      data: { suspended: false },
    });
    await client.donor.updateMany({ data: { sharePhone: false } });
    expect((await reveal(viewer)).status).toBe(404);
    await client.donor.updateMany({
      data: { sharePhone: true, visible: false },
    });
    expect((await reveal(viewer)).status).toBe(404);
  });

  it("rate limits repeated reveals", async () => {
    await client.donor.updateMany({ data: { phonePublic: true } });
    const codes: number[] = [];
    for (let i = 0; i < 12; i++) codes.push((await reveal(viewer)).status);
    expect(codes).toContain(429);
  });
});
