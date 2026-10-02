import assert from "node:assert/strict";
import { Client } from "pg";
import { chromium } from "@playwright/test";
const base = "http://localhost:3002";
const pg = new Client({
  connectionString: "postgresql://postgres:postgres@127.0.0.1:55432/postgres",
});
async function post(path: string, body: unknown, cookie = "", origin = base) {
  const r = await fetch(base + path, {
    method: "POST",
    headers: {
      Origin: origin,
      Cookie: cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return {
    r,
    data: await r.json(),
    cookie: r.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; "),
  };
}
async function main() {
  await pg.connect();
  await pg.query('TRUNCATE "User", "AdminAudit", "RateLimit" CASCADE');
  const admin = await post("/api/auth/sign-up/email", {
    name: "Admin Fixture",
    email: "admin@example.com",
    username: "admin_fixture",
    password: "isolated-admin-password-42",
  });
  const member = await post("/api/auth/sign-up/email", {
    name: "Member Fixture",
    email: "member@example.com",
    username: "member_fixture",
    password: "isolated-member-password-42",
  });
  assert.equal(admin.r.status, 200);
  assert.equal(member.r.status, 200);
  await pg.query('UPDATE "User" SET role=$1 WHERE id=$2', [
    "ADMIN",
    admin.data.user.id,
  ]);
  const userId = member.data.user.id;
  await pg.query(
    'INSERT INTO "Donor" (id,"publicId","userId",name,"bloodGroup",phone,visible,"consentAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,true,NOW(),NOW())',
    [
      "admin-donor-fixture",
      crypto.randomUUID(),
      userId,
      "Member Fixture",
      "A+",
      "+8801712345678",
    ],
  );
  const change = (action: string, cookie = admin.cookie, extra = {}) =>
    post(
      "/api/admin",
      { userId, action, reason: "Isolated administrator test", ...extra },
      cookie,
    );
  assert.equal((await change("hide", member.cookie)).r.status, 403);
  assert.equal((await change("hide", "")).r.status, 403);
  assert.equal(
    (
      await post(
        "/api/admin",
        { userId, action: "hide", reason: "test" },
        admin.cookie,
        "https://evil.example",
      )
    ).r.status,
    400,
  );
  assert.equal((await change("hide")).r.status, 200);
  assert.equal(
    (
      await pg.query(
        'SELECT "moderationBlocked" FROM "Donor" WHERE "userId"=$1',
        [userId],
      )
    ).rows[0].moderationBlocked,
    true,
  );
  assert.equal((await change("restore")).r.status, 200);
  assert.equal((await change("suspend")).r.status, 200);
  assert.equal(
    (
      await pg.query('SELECT count(*) FROM "Session" WHERE "userId"=$1', [
        userId,
      ])
    ).rows[0].count,
    "0",
  );
  assert.equal(
    (
      await post("/api/auth/sign-in/email", {
        email: "member@example.com",
        password: "isolated-member-password-42",
      })
    ).r.ok,
    false,
  );
  assert.equal((await change("unsuspend")).r.status, 200);
  assert.equal(
    (
      await post(
        "/api/admin",
        {
          userId: admin.data.user.id,
          action: "demote",
          reason: "test own role",
        },
        admin.cookie,
      )
    ).r.status,
    400,
  );
  await pg.query(
    'INSERT INTO "Donation" (id,"donorId",date,"submissionId") VALUES ($1,$2,$3,$4)',
    [
      "admin-donation-fixture",
      "admin-donor-fixture",
      "2025-01-01",
      crypto.randomUUID(),
    ],
  );
  assert.equal(
    (
      await change("delete-donation", admin.cookie, {
        donationId: "admin-donation-fixture",
      })
    ).r.status,
    200,
  );
  assert.equal(
    (
      await pg.query('SELECT "donationCount" FROM "Donor" WHERE id=$1', [
        "admin-donor-fixture",
      ])
    ).rows[0].donationCount,
    0,
  );
  assert.equal(
    (await pg.query('SELECT count(*) FROM "AdminAudit"')).rows[0].count,
    "5",
  );
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await context.addCookies(
    admin.cookie.split("; ").map((c) => {
      const i = c.indexOf("=");
      return {
        name: c.slice(0, i),
        value: c.slice(i + 1),
        domain: "localhost",
        path: "/",
        secure: true,
      };
    }),
  );
  await context.addCookies([
    { name: "jibondrop-language", value: "en", url: base },
  ]);
  const page = await context.newPage();
  await page.goto(base + "/admin");
  await page.getByRole("heading", { name: "Manage users" }).waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: "/tmp/jibon-admin-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "BN", exact: true }).click();
  await page.waitForFunction(() => document.documentElement.lang === "bn");
  await page
    .getByRole("heading", { name: "ব্যবহারকারী পরিচালনা", exact: true })
    .waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await browser.close();
  await pg.query('TRUNCATE "User", "Donor", "AdminAudit", "RateLimit" CASCADE');
  await pg.end();
  console.log(
    "PASS: admin authorization, CSRF, listing moderation, suspension/session revocation, self-role protection, donation totals, audit trail and mobile admin layout.",
  );
}
main().catch(async (e) => {
  console.error(e);
  await pg.end();
  process.exit(1);
});
