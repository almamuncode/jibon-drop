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

const sendAccountEmail = vi.fn();
vi.mock("../lib/email", () => ({
  sendAccountEmail: (...args: unknown[]) => sendAccountEmail(...args),
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

type Lib = typeof import("../lib/notifications");
let lib: Lib;
let contactRoute: typeof import("../app/api/contact/route");
let readRoute: typeof import("../app/api/notifications/read/route");
let countRoute: typeof import("../app/api/notifications/route");
let client: ReturnType<typeof import("../lib/db").db>;
let pg: PGlite;
let server: PGLiteSocketServer;
const ids = { donor: "donor-user", other: "other-user", requester: "req-user" };
let publicId = "";
let donorId = "";

beforeAll(async () => {
  pg = new PGlite();
  for (const dir of fs
    .readdirSync("prisma/migrations")
    .filter((name) => /^\d/.test(name))
    .sort())
    await pg.exec(
      fs.readFileSync(`prisma/migrations/${dir}/migration.sql`, "utf8"),
    );
  server = new PGLiteSocketServer({ db: pg, port: 55433, host: "127.0.0.1" });
  await server.start();
  process.env.DATABASE_URL = "postgresql://postgres@127.0.0.1:55433/postgres";
  process.env.JIBONDROP_TEST_BUILD = "1";
  process.env.AUTH_SECRET = "x".repeat(40);
  process.env.BETTER_AUTH_URL = "https://jibon.example/";
  client = (await import("../lib/db")).db();
  lib = await import("../lib/notifications");
  contactRoute = await import("../app/api/contact/route");
  readRoute = await import("../app/api/notifications/read/route");
  countRoute = await import("../app/api/notifications/route");
});
afterAll(async () => {
  await client?.$disconnect();
  await server?.stop();
  await pg?.close();
});
beforeEach(async () => {
  sendAccountEmail.mockReset();
  sendAccountEmail.mockResolvedValue(undefined);
  await client.$executeRawUnsafe(
    'TRUNCATE "Notification","ContactRequest","Donor","User","RateLimit" CASCADE',
  );
  for (const id of Object.values(ids))
    await client.user.create({
      data: { id, name: id, email: `${id}@example.com` },
    });
  const donor = await client.donor.create({
    data: {
      userId: ids.donor,
      name: "Donor",
      bloodGroup: "A+",
      phone: "+8801712345678",
      visible: true,
      consentAt: new Date(),
    },
  });
  publicId = donor.publicId;
  donorId = donor.id;
});

const post = (path: string, user: string | null, body: unknown) =>
  new Request("http://localhost:3000" + path, {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      host: "localhost:3000",
      "content-type": "application/json",
      ...(user ? { "x-test-user": user } : {}),
    },
    body: JSON.stringify(body),
  });
const get = (path: string, user: string | null) =>
  new Request("http://localhost:3000" + path, {
    headers: user ? { "x-test-user": user } : {},
  });
const sendRequest = (user = ids.requester) =>
  contactRoute.POST(
    post("/api/contact", user, {
      publicId,
      message: "I urgently need A+ blood for my relative.",
    }),
  );
const flush = () => new Promise((resolve) => setTimeout(resolve, 100));

describe("donor notifications", () => {
  it("emails only a safe link and omits sensitive details", async () => {
    expect((await sendRequest()).status).toBe(200);
    await flush();
    expect(sendAccountEmail).toHaveBeenCalledTimes(1);
    const [to, subject, text] = sendAccountEmail.mock.calls[0] as string[];
    const note = await client.notification.findFirstOrThrow();
    expect(to).toBe("donor-user@example.com");
    expect(text).toContain(
      `https://jibon.example/dashboard/requests?request=${note.contactRequestId}`,
    );
    for (const secret of ["urgently", "8801712345678", "req-user", "relative"])
      expect(subject + text).not.toContain(secret);
    expect(note.emailStatus).toBe("SENT");
  });

  it("keeps the request and records failures when email fails", async () => {
    sendAccountEmail.mockRejectedValue(new Error("resend down"));
    expect((await sendRequest()).status).toBe(200);
    await flush();
    expect(await client.contactRequest.count()).toBe(1);
    const note = await client.notification.findFirstOrThrow();
    expect(note.emailStatus).toBe("FAILED");
    expect(note.emailAttempts).toBe(1);
    expect(note.emailError).toBeTruthy();
    expect(await lib.unreadCount(ids.donor)).toBe(1);
  });

  it("sends each notification email at most once", async () => {
    await sendRequest();
    await flush();
    const note = await client.notification.findFirstOrThrow();
    expect(await lib.deliverNotification(note.id)).toBe("unavailable");
    expect(sendAccountEmail).toHaveBeenCalledTimes(1);
  });

  it("does not create or email a second notification for a repeated request", async () => {
    await sendRequest();
    await sendRequest();
    await flush();
    expect(await client.notification.count()).toBe(1);
    expect(sendAccountEmail).toHaveBeenCalledTimes(1);
  });

  it("limits emails per recipient per hour", async () => {
    for (let i = 0; i < lib.notificationLimits.emailsPerHour; i++) {
      const requester = await client.user.create({
        data: { id: `r${i}`, name: "r", email: `r${i}@example.com` },
      });
      const request = await client.contactRequest.create({
        data: { donorId, requesterId: requester.id, message: "message text" },
      });
      const note = await client.notification.create({
        data: {
          userId: ids.donor,
          contactRequestId: request.id,
          emailStatus: "SENT",
          emailSentAt: new Date(),
        },
      });
      expect(note.id).toBeTruthy();
    }
    await sendRequest();
    await flush();
    const note = await client.notification.findFirstOrThrow({
      where: { emailStatus: "SKIPPED" },
    });
    expect(note.userId).toBe(ids.donor);
    expect(sendAccountEmail).not.toHaveBeenCalled();
  });

  it("counts unread per recipient and marks only the owner's notifications", async () => {
    await sendRequest();
    await sendRequest(ids.other);
    await flush();
    expect(await lib.unreadCount(ids.donor)).toBe(2);
    expect(await lib.unreadCount(ids.other)).toBe(0);
    const note = await client.notification.findFirstOrThrow();
    expect(await lib.markRead(ids.other, note.id)).toBe(0);
    expect(
      await lib.markRequestRead(ids.requester, note.contactRequestId),
    ).toBe(0);
    expect(await lib.unreadCount(ids.donor)).toBe(2);
    expect(await lib.markRequestRead(ids.donor, note.contactRequestId)).toBe(1);
    expect(await lib.unreadCount(ids.donor)).toBe(1);
  });

  it("excludes unread notifications for requests that are no longer pending", async () => {
    await sendRequest();
    await flush();
    const request = await client.contactRequest.findFirstOrThrow();
    await client.contactRequest.update({
      where: { id: request.id },
      data: { status: "REVOKED" },
    });
    expect(await lib.unreadCount(ids.donor)).toBe(0);
    expect(await lib.unreadRequestIds(ids.donor)).toEqual(new Set());
    expect(
      await countRoute.GET(get("/api/notifications", ids.donor)),
    ).toHaveProperty("status", 200);
    expect(
      await (
        await countRoute.GET(get("/api/notifications", ids.donor))
      ).json(),
    ).toEqual({ unread: 0 });
  });

  it("enforces authentication and ownership on the API", async () => {
    await sendRequest();
    await flush();
    const note = await client.notification.findFirstOrThrow();
    expect((await countRoute.GET(get("/api/notifications", null))).status).toBe(
      401,
    );
    expect(
      (
        await readRoute.POST(
          post("/api/notifications/read", null, { id: note.id }),
        )
      ).status,
    ).toBe(401);
    const stranger = await readRoute.POST(
      post("/api/notifications/read", ids.other, { id: note.id }),
    );
    expect(await stranger.json()).toEqual({ unread: 0 });
    expect((await client.notification.findFirstOrThrow()).readAt).toBeNull();
    const owner = await readRoute.POST(
      post("/api/notifications/read", ids.donor, { id: note.id }),
    );
    expect(await owner.json()).toEqual({ unread: 0 });
    expect(
      (await client.notification.findFirstOrThrow()).readAt,
    ).not.toBeNull();
    const other = await countRoute.GET(get("/api/notifications", ids.donor));
    expect(await other.json()).toEqual({ unread: 0 });
  });
});
