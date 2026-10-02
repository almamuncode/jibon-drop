import assert from "node:assert/strict";
import { Client } from "pg";
import { chromium } from "@playwright/test";
const base = process.env.TEST_APP_URL || "http://localhost:3002";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("Tests require a local application.");
const pg = new Client({
  connectionString: "postgresql://postgres:postgres@127.0.0.1:55432/postgres",
});
async function call(path: string, body: unknown, cookie = "", method = "POST") {
  const response = await fetch(base + "/api/" + path, {
    method,
    headers: {
      Origin: base,
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify(body),
  });
  return {
    response,
    data: await response.json(),
    cookie: response.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; "),
  };
}
const password = "isolated-Test-password-42";
const profile = {
  name: "Isolated Test Donor",
  phone: "01712345678",
  bloodGroup: "A+",
  divisionId: "division:1",
  districtId: "district:1",
  localityId: "upazila:1",
  areaId: "union:1",
  fallbackArea: null,
  available: true,
  visible: true,
  consent: true,
};
async function main() {
  await pg.connect();
  await pg.query(
    'TRUNCATE "User", "Donor", "RateLimit", "Verification" CASCADE',
  );
  const first = await call("auth/sign-up/email", {
    name: "Isolated Test Donor",
    email: "fixture@example.com",
    username: "fixture_donor",
    password,
  });
  assert.equal(first.response.status, 200, JSON.stringify(first.data));
  assert.ok(first.cookie);
  const cookie = first.cookie;
  assert.equal(
    (
      await call("auth/sign-up/email", {
        name: "Duplicate",
        email: "fixture@example.com",
        username: "another_user",
        password,
      })
    ).response.status >= 400,
    true,
  );
  assert.equal(
    (
      await call("auth/sign-up/email", {
        name: "Duplicate",
        email: "another@example.com",
        username: "fixture_donor",
        password,
      })
    ).response.status >= 400,
    true,
  );
  const credential = (
    await pg.query(
      `SELECT password FROM "Account" WHERE "providerId"='credential'`,
    )
  ).rows[0];
  assert.ok(credential.password);
  assert.notEqual(credential.password, password);
  assert.ok(!credential.password.includes(password));
  assert.equal((await call("profile", profile)).response.status, 400);
  assert.equal(
    (await call("profile", { ...profile, districtId: "district:64" }, cookie))
      .response.status,
    400,
  );
  assert.equal((await call("profile", profile, cookie)).response.status, 200);
  const donor = (
    await pg.query('SELECT * FROM "Donor" WHERE phone=$1', ["+8801712345678"])
  ).rows[0];
  assert.equal(donor.phoneVerifiedAt, null);
  const search = await (
    await fetch(base + "/find-donors?bloodGroup=A%2B")
  ).text();
  assert.ok(search.includes(profile.name));
  for (const privateValue of [
    "+8801712345678",
    "fixture@example.com",
    credential.password,
  ])
    assert.ok(!search.includes(privateValue));
  assert.equal(
    (await call("contact", { publicId: donor.publicId })).response.status,
    401,
  );
  // Respect Better Auth’s short-window registration throttle.
  await new Promise((resolve) => setTimeout(resolve, 11000));
  const second = await call("auth/sign-up/email", {
    name: "Other fixture",
    email: "second@example.com",
    username: "second_donor",
    password,
  });
  assert.equal(second.response.status, 200);
  const request = await call(
    "contact",
    {
      publicId: donor.publicId,
      message: "Need A+ blood at the local hospital today.",
    },
    second.cookie,
  );
  assert.equal(request.response.status, 200);
  assert.equal(request.data.status, "PENDING");
  assert.equal(request.data.phone, undefined);
  assert.equal(
    (
      await call(
        "contact-requests",
        { id: request.data.id, action: "approve" },
        cookie,
      )
    ).response.status,
    200,
  );
  assert.equal(
    (
      await call(
        "contact",
        { publicId: donor.publicId, intent: "reveal" },
        second.cookie,
      )
    ).data.phone,
    "+8801712345678",
  );

  const submissionId = crypto.randomUUID();
  assert.equal(
    (
      await call(
        "donations",
        { date: "2020-01-01", note: "PRIVATE FIXTURE NOTE", submissionId },
        cookie,
      )
    ).response.status,
    200,
  );
  await call("donations", { date: "2020-01-01", submissionId }, cookie);
  const saved = (
    await pg.query('SELECT * FROM "Donation" WHERE "donorId"=$1', [donor.id])
  ).rows;
  assert.equal(saved.length, 1);
  assert.equal(
    (
      await call(
        "donations",
        { id: saved[0].id, date: "2021-01-01", submissionId },
        second.cookie,
      )
    ).response.status,
    400,
  );
  assert.equal(
    (
      await call(
        "donations",
        { id: saved[0].id, date: "2021-01-01", submissionId },
        cookie,
      )
    ).response.status,
    200,
  );
  let aggregate = (
    await pg.query(
      'SELECT "donationCount", "lastDonation"::text FROM "Donor" WHERE id=$1',
      [donor.id],
    )
  ).rows[0];
  assert.equal(aggregate.donationCount, 1);
  assert.equal(aggregate.lastDonation, "2021-01-01");
  assert.equal(
    (
      await call(
        "donations",
        { date: "2099-01-01", submissionId: crypto.randomUUID() },
        cookie,
      )
    ).response.status,
    400,
  );
  await call("profile", { ...profile, visible: false, consent: false }, cookie);
  assert.equal(
    (await call("contact", { publicId: donor.publicId }, second.cookie))
      .response.status,
    404,
  );
  assert.equal((await fetch(base + "/donors/" + donor.publicId)).status, 404);
  await call("donations", { id: saved[0].id }, cookie, "DELETE");
  aggregate = (
    await pg.query(
      'SELECT "donationCount", "lastDonation" FROM "Donor" WHERE id=$1',
      [donor.id],
    )
  ).rows[0];
  assert.equal(aggregate.donationCount, 0);
  assert.equal(aggregate.lastDonation, null);
  await call("logout", {}, cookie);
  assert.equal((await call("profile", profile, cookie)).response.status, 400);
  assert.equal(
    (
      await call("auth/sign-in/email", {
        email: "fixture@example.com",
        password: "incorrect-password",
      })
    ).response.status >= 400,
    true,
  );
  const emailLogin = await call("auth/sign-in/email", {
    email: "fixture@example.com",
    password,
  });
  assert.equal(emailLogin.response.status, 200);
  const usernameLogin = await call("auth/sign-in/username", {
    username: "FIXTURE_DONOR",
    password,
  });
  assert.equal(
    usernameLogin.response.status,
    200,
    JSON.stringify(usernameLogin.data),
  );
  assert.equal(
    (await call("profile", profile, usernameLogin.cookie)).response.status,
    200,
  );
  assert.equal(
    (
      await call(
        "auth/change-email",
        { newEmail: "attacker@example.com" },
        usernameLogin.cookie,
      )
    ).response.status,
    403,
  );
  assert.equal(
    (await call("auth/delete-user", {}, usernameLogin.cookie)).response.status,
    403,
  );
  assert.equal(
    (
      await call(
        "account",
        { confirm: "DELETE" },
        usernameLogin.cookie,
        "DELETE",
      )
    ).response.status,
    200,
  );
  assert.equal((await fetch(base + "/donors/" + donor.publicId)).status, 404);
  assert.equal(
    (await call("profile", profile, emailLogin.cookie)).response.status,
    400,
  );
  assert.equal(
    (
      await pg.query('SELECT COUNT(*) FROM "Account" WHERE "userId"=$1', [
        first.data.user.id,
      ])
    ).rows[0].count,
    "0",
  );
  await pg.query('DELETE FROM "RateLimit"');
  for (let i = 0; i < 10; i++)
    await call("auth/sign-in/email", { email: "absent@example.com", password });
  assert.equal(
    (
      await call("auth/sign-in/email", {
        email: "absent@example.com",
        password,
      })
    ).response.status,
    429,
  );
  console.log(
    "PASS: email registration/login; case-insensitive username login; password hashing; duplicate accounts; persistent throttling; private identity; donor ownership; contact consent; donation aggregates; logout; account deletion revokes every session.",
  );
  const browser = await chromium.launch({
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {}),
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page
    .context()
    .addCookies([{ name: "jibondrop-language", value: "en", url: base }]);
  await page.goto(base + "/register");
  await page.getByLabel("Full name", { exact: true }).fill("Browser Fixture");
  await page.getByLabel("Email", { exact: true }).fill("browser@example.com");
  await page.getByLabel("Username", { exact: true }).fill("browser_fixture");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.waitForURL("**/dashboard/profile");
  await page
    .getByRole("button", { name: "Change profile", exact: true })
    .click();
  await page.getByLabel("Contact mobile number").fill("01912345678");
  await page.getByLabel("Blood group", { exact: true }).selectOption("B+");
  await page.getByLabel("Division", { exact: true }).selectOption("division:1");
  await page.getByLabel("District", { exact: true }).selectOption("district:1");
  await page
    .getByLabel("Upazila / Thana", { exact: true })
    .selectOption("upazila:1");
  await page.getByLabel("I consent", { exact: false }).check();
  await page.getByLabel("Show my listing", { exact: false }).check();
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await page.getByText("Profile saved.", { exact: true }).waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: "/tmp/jibondrop-account-mobile.png",
    fullPage: true,
  });
  await page.goto(base + "/dashboard");
  await page.locator('summary[aria-label="Open account options"]').click();
  await page
    .getByRole("link", { name: "Settings", exact: true })
    .first()
    .click();
  await page.getByLabel("Current password", { exact: true }).fill(password);
  await page
    .getByLabel("New password", { exact: true })
    .fill("updated-Isolated-password-42");
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill("updated-Isolated-password-42");
  await page
    .getByRole("button", { name: "Update password", exact: true })
    .click();
  await page
    .getByText(
      "Password updated. Other signed-in sessions have been logged out.",
    )
    .waitFor();
  await page.screenshot({
    path: "/tmp/jibondrop-settings-mobile.png",
    fullPage: true,
  });
  await page.goto(base + "/login");
  await page.waitForURL("**/dashboard");
  await page.locator('summary[aria-label="Open account options"]').click();
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await page.waitForURL(base + "/");
  await page.goto(base + "/login");
  await page.getByLabel("Email or username").fill("browser_fixture");
  await page
    .getByLabel("Password", { exact: true })
    .fill("updated-Isolated-password-42");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForURL("**/dashboard");
  await browser.close();
  console.log(
    "PASS: mobile registration, profile completion, username login and layout.",
  );
  await pg.query(
    'TRUNCATE "User", "Donor", "RateLimit", "Verification" CASCADE',
  );
  await pg.end();
}
main().catch(async (e) => {
  console.error(e);
  await pg.end();
  process.exit(1);
});
