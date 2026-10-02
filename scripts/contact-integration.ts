import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { Client } from "pg";
import { chromium } from "@playwright/test";
const base = "http://localhost:3002";
const pg = new Client({
  connectionString: "postgresql://postgres:postgres@127.0.0.1:55432/postgres",
});
const password = "isolated-contact-password-42";
const profile = {
  name: "Private Donor",
  phone: "01712345678",
  bloodGroup: "A+",
  divisionId: "division:1",
  districtId: "district:1",
  localityId: "upazila:1",
  areaId: null,
  fallbackArea: null,
  visible: true,
  sharePhone: true,
  available: true,
  consent: true,
};
async function call(
  path: string,
  body: unknown,
  cookie = "",
  origin = base,
  method = "POST",
) {
  const response = await fetch(base + "/api/" + path, {
    method,
    headers: {
      Origin: origin,
      Cookie: cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; "),
  };
}
async function signup(name: string) {
  const result = await call("auth/sign-up/email", {
    name,
    email: name.toLowerCase() + "@example.com",
    username: name.toLowerCase(),
    password,
  });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  return { ...result, id: result.data.user.id };
}
async function main() {
  await pg.connect();
  await pg.query(
    'TRUNCATE "User", "Donor", "RateLimit", "Verification", "AdminAudit" CASCADE',
  );
  const owner = await signup("ContactOwner");
  await new Promise((resolve) => setTimeout(resolve, 11000));
  const requester = await signup("ContactRequester");
  await new Promise((resolve) => setTimeout(resolve, 11000));
  const outsider = await signup("ContactOutsider");
  assert.equal((await call("profile", profile, owner.cookie)).status, 200);
  const donor = (
    await pg.query('SELECT id,"publicId" FROM "Donor" WHERE "userId"=$1', [
      owner.id,
    ])
  ).rows[0];
  const ask = (cookie = requester.cookie, extras = {}) =>
    call(
      "contact",
      {
        publicId: donor.publicId,
        message: "Need A+ blood at the local hospital this evening.",
        ...extras,
      },
      cookie,
    );
  const reveal = (cookie = requester.cookie) =>
    call("contact", { publicId: donor.publicId, intent: "reveal" }, cookie);
  const decide = (id: string, action: string, cookie = owner.cookie) =>
    call("contact-requests", { id, action }, cookie);
  const resetLimits = () => pg.query('TRUNCATE "RateLimit"');
  assert.equal((await ask("")).status, 401);
  assert.equal((await ask(owner.cookie)).status, 400);
  assert.equal((await ask(requester.cookie, {})).data.phone, undefined);
  let request = (await ask()).data;
  assert.equal(request.status, "PENDING");
  assert.equal((await ask()).data.id, request.id);
  assert.equal((await reveal()).status, 403);
  assert.equal(
    (await decide(request.id, "approve", outsider.cookie)).status,
    404,
  );
  assert.equal(
    (
      await call(
        "reports",
        {
          contactRequestId: request.id,
          reason: "SPAM",
          details: "This is an unrelated account.",
        },
        outsider.cookie,
      )
    ).status,
    404,
  );
  assert.equal((await decide(request.id, "approve")).status, 200);
  assert.equal((await reveal()).data.phone, "+8801712345678");
  assert.equal((await reveal(outsider.cookie)).status, 403);
  const publicHtml = await (
    await fetch(base + "/donors/" + donor.publicId)
  ).text();
  assert.ok(!publicHtml.includes("+8801712345678"));
  await pg.query('UPDATE "ContactRequest" SET "expiresAt"=$1 WHERE id=$2', [
    new Date(Date.now() - 1000).toISOString(),
    request.id,
  ]);
  await resetLimits();
  assert.equal((await reveal()).status, 403);
  assert.equal((await ask()).data.status, "PENDING");
  assert.equal((await decide(request.id, "approve")).status, 200);
  assert.equal(
    (await call("profile", { ...profile, sharePhone: false }, owner.cookie))
      .status,
    200,
  );
  assert.equal((await reveal()).status, 404);
  assert.equal((await fetch(base + "/donors/" + donor.publicId)).status, 200);
  assert.equal((await call("profile", profile, owner.cookie)).status, 200);
  assert.equal((await reveal()).status, 403);
  await pg.query("UPDATE \"ContactRequest\" SET status='PENDING' WHERE id=$1", [
    request.id,
  ]);
  assert.equal((await decide(request.id, "approve")).status, 200);
  assert.equal(
    (await call("profile", { ...profile, phone: "01812345678" }, owner.cookie))
      .status,
    200,
  );
  assert.equal((await reveal()).status, 403);
  await pg.query("UPDATE \"ContactRequest\" SET status='PENDING' WHERE id=$1", [
    request.id,
  ]);
  assert.equal((await decide(request.id, "approve")).status, 200);
  assert.equal(
    (
      await call(
        "status",
        { available: true, visible: false },
        owner.cookie,
        base,
        "PATCH",
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await call(
        "status",
        { available: true, visible: true },
        owner.cookie,
        base,
        "PATCH",
      )
    ).status,
    200,
  );
  assert.equal((await reveal()).status, 403);
  await resetLimits();
  await pg.query("UPDATE \"ContactRequest\" SET status='PENDING' WHERE id=$1", [
    request.id,
  ]);
  assert.equal((await decide(request.id, "approve")).status, 200);
  assert.equal(
    (
      await call(
        "profile",
        { ...profile, consent: false, visible: false },
        owner.cookie,
      )
    ).status,
    200,
  );
  assert.equal((await call("profile", profile, owner.cookie)).status, 200);
  assert.equal((await reveal()).status, 403);
  await pg.query("UPDATE \"ContactRequest\" SET status='PENDING' WHERE id=$1", [
    request.id,
  ]);
  assert.equal((await decide(request.id, "decline")).status, 200);
  assert.equal((await ask()).data.status, "DECLINED");
  assert.equal((await decide(request.id, "approve")).status, 409);
  await resetLimits();
  const secret = process.env.AUTH_SECRET;
  assert.ok(secret, "Pass the isolated app's AUTH_SECRET to this test.");
  for (const [key, count] of [
    ["contact-account-hour:" + requester.id, 10],
    ["contact-ip-hour:local", 20],
    ["contact-account-day:" + requester.id, 25],
    ["contact-ip-day:local", 50],
  ] as const) {
    await resetLimits();
    const hashed = createHmac("sha256", secret).update(key).digest("hex");
    await pg.query(
      'INSERT INTO "RateLimit" (key,count,"resetAt") VALUES ($1,$2,NOW()+INTERVAL \'1 day\')',
      [hashed, count],
    );
    assert.equal((await reveal()).status, 429, key);
  }
  await resetLimits();
  // Grant and report serialize on the same donor row; a report wins over disclosure.
  await pg.query("UPDATE \"ContactRequest\" SET status='PENDING' WHERE id=$1", [
    request.id,
  ]);
  const [approval, report] = await Promise.all([
    decide(request.id, "approve"),
    call(
      "reports",
      {
        contactRequestId: request.id,
        reason: "UNWANTED_CONTACT",
        details: "The contact was unwanted and repeated.",
      },
      requester.cookie,
    ),
  ]);
  assert.ok([200, 409].includes(approval.status));
  assert.equal(report.status, 200);
  assert.equal((await reveal()).status, 403);
  assert.equal((await ask()).data.status, "REVOKED");
  const savedReport = (await pg.query('SELECT * FROM "AbuseReport"')).rows[0];
  assert.equal(savedReport.targetUserId, owner.id);
  assert.equal(savedReport.reporterId, requester.id);
  assert.equal(
    (
      await call(
        "admin/reports",
        { id: savedReport.id, reason: "Reviewed test report" },
        requester.cookie,
      )
    ).status,
    403,
  );
  await pg.query("UPDATE \"User\" SET role='ADMIN' WHERE id=$1", [outsider.id]);
  assert.equal((await reveal(outsider.cookie)).status, 403);
  await pg.query("UPDATE \"ContactRequest\" SET status='PENDING' WHERE id=$1", [
    request.id,
  ]);
  assert.equal((await decide(request.id, "approve")).status, 200);
  assert.equal(
    (
      await call(
        "admin",
        {
          userId: owner.id,
          action: "hide",
          reason: "Isolated privacy moderation test",
        },
        outsider.cookie,
      )
    ).status,
    200,
  );
  assert.equal((await reveal()).status, 404);
  assert.equal(
    (
      await call(
        "admin",
        {
          userId: owner.id,
          action: "restore",
          reason: "Isolated privacy restore test",
        },
        outsider.cookie,
      )
    ).status,
    200,
  );
  assert.equal((await reveal()).status, 403);
  await pg.query("UPDATE \"ContactRequest\" SET status='PENDING' WHERE id=$1", [
    request.id,
  ]);
  assert.equal((await decide(request.id, "approve")).status, 200);
  assert.equal(
    (
      await call(
        "admin",
        {
          userId: requester.id,
          action: "suspend",
          reason: "Isolated privacy suspension test",
        },
        outsider.cookie,
      )
    ).status,
    200,
  );
  assert.equal((await reveal()).status, 401);
  assert.equal(
    (
      await call(
        "admin",
        {
          userId: requester.id,
          action: "unsuspend",
          reason: "Isolated privacy reactivation test",
        },
        outsider.cookie,
      )
    ).status,
    200,
  );
  const login = await call("auth/sign-in/email", {
    email: "contactrequester@example.com",
    password,
  });
  assert.equal(login.status, 200);
  requester.cookie = login.cookie;
  await resetLimits();
  assert.equal((await reveal()).status, 403);
  assert.equal(
    (
      await call(
        "admin/reports",
        { id: savedReport.id, reason: "Reviewed test report" },
        outsider.cookie,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await pg.query('SELECT status FROM "AbuseReport" WHERE id=$1', [
        savedReport.id,
      ])
    ).rows[0].status,
    "RESOLVED",
  );
  assert.equal(
    (
      await pg.query(
        "SELECT count(*) FROM \"AdminAudit\" WHERE action='resolve-report'",
      )
    ).rows[0].count,
    "1",
  );
  // Browser flow in Bangla with separate donor/requester sessions.
  await resetLimits();
  await pg.query('DELETE FROM "AbuseReport"');
  await pg.query('DELETE FROM "ContactRequest"');
  await call("profile", profile, owner.cookie);
  const browser = await chromium.launch({ headless: true });
  try {
    const contextFor = async (cookie: string) => {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
      });
      await context.addCookies(
        cookie.split("; ").map((value) => {
          const i = value.indexOf("=");
          return {
            name: value.slice(0, i),
            value: value.slice(i + 1),
            domain: "localhost",
            path: "/",
            secure: true,
          };
        }),
      );
      await context.addCookies([
        {
          name: "jibondrop-language",
          value: "bn",
          domain: "localhost",
          path: "/",
        },
      ]);
      return context;
    };
    const donorContext = await contextFor(owner.cookie),
      visitorContext = await contextFor(requester.cookie);
    const visitor = await visitorContext.newPage(),
      ownerPage = await donorContext.newPage();
    await visitor.goto(base + "/donors/" + donor.publicId);
    await visitor
      .getByRole("button", {
        name: "রক্তদাতার সঙ্গে যোগাযোগের অনুরোধ",
        exact: true,
      })
      .click();
    await visitor
      .getByLabel("কেন এই রক্তদাতার সঙ্গে যোগাযোগ করতে চান?")
      .fill("আজ সন্ধ্যায় হাসপাতালে এ পজিটিভ রক্ত প্রয়োজন।");
    await visitor
      .getByRole("button", { name: "যোগাযোগের অনুরোধ পাঠান", exact: true })
      .click();
    await visitor
      .getByText("রক্তদাতার অনুমোদনের অপেক্ষায়। তাঁর নম্বর ব্যক্তিগত থাকছে।", {
        exact: true,
      })
      .waitFor();
    assert.ok(
      !(await visitor.locator("body").innerText()).includes("+8801712345678"),
    );
    await ownerPage.goto(base + "/dashboard/requests");
    await ownerPage
      .getByRole("button", { name: "২৪ ঘণ্টার জন্য অনুমোদন", exact: true })
      .click();
    await ownerPage
      .getByRole("button", { name: "অনুমতি প্রত্যাহার", exact: true })
      .waitFor();
    await visitor
      .getByRole("button", { name: "অনুরোধের অবস্থা দেখুন", exact: true })
      .click();
    await visitor
      .getByRole("button", { name: "ফোন নম্বর দেখুন", exact: true })
      .click();
    await visitor
      .getByRole("link", { name: "+8801712345678", exact: true })
      .waitFor();
    assert.equal(
      await ownerPage.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await ownerPage.screenshot({
      path: "/tmp/jibondrop-contact-requests-mobile.png",
      fullPage: true,
    });
    await ownerPage
      .getByRole("button", { name: "অনুমতি প্রত্যাহার", exact: true })
      .click();
    await visitor.reload();
    await visitor
      .getByRole("button", {
        name: "রক্তদাতার সঙ্গে যোগাযোগের অনুরোধ",
        exact: true,
      })
      .click();
    await visitor
      .getByText(
        "এই অনুরোধ প্রত্যাখ্যাত হয়েছে বা অনুমতি প্রত্যাহার করা হয়েছে। যোগাযোগের সিদ্ধান্তকে সম্মান করুন।",
        { exact: true },
      )
      .waitFor();
    assert.ok(
      !(await visitor.locator("body").innerText()).includes("+8801712345678"),
    );
  } finally {
    await browser.close();
  }
  assert.equal(
    (await call("account", { confirm: "DELETE" }, owner.cookie)).status,
    405,
  ); // DELETE is tested separately below.
  const deleted = await fetch(base + "/api/account", {
    method: "DELETE",
    headers: {
      Origin: base,
      Cookie: owner.cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ confirm: "DELETE" }),
  });
  assert.equal(deleted.status, 200);
  assert.equal(
    (await pg.query('SELECT count(*) FROM "ContactRequest"')).rows[0].count,
    "0",
  );
  console.log(
    "PASS: login-required contact; donor approval and ownership; no public phone leakage; expiry; sharing/visibility/phone-change revocation; account/IP hourly and daily limits; report authorization and approval race; admin resolution/audit; Bangla browser approval/revocation; deletion cascades.",
  );
  await pg.query(
    'TRUNCATE "User", "Donor", "RateLimit", "Verification", "AdminAudit" CASCADE',
  );
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pg.end());
