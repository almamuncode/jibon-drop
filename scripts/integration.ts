import assert from "node:assert/strict";
import { Client } from "pg";
import { chromium } from "@playwright/test";
const base = "http://127.0.0.1:3000";
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
    cookie: response.headers.get("set-cookie")?.split(";")[0] || "",
  };
}
const profile = {
  name: "Isolated Test Donor",
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
async function login(phone: string) {
  const sent = await call("otp/send", { phone });
  assert.equal(sent.response.status, 200, JSON.stringify(sent.data));
  assert.match(sent.data.devCode, /^\d{6}$/);
  const verified = await call("otp/verify", { phone, code: sent.data.devCode });
  assert.equal(verified.response.status, 200, JSON.stringify(verified.data));
  return { cookie: verified.cookie, code: sent.data.devCode };
}
async function main() {
  await pg.connect();
  await pg.query('TRUNCATE "Donor", "Otp", "RateLimit" CASCADE');
  const one = await login("01712345678");
  assert.equal(
    (await call("otp/verify", { phone: "01712345678", code: one.code }))
      .response.status,
    400,
  );
  assert.equal(
    (await call("otp/send", { phone: "01712345678" })).response.status,
    200,
  );
  assert.equal(
    (await call("otp/send", { phone: "01712345678" })).response.status,
    400,
  );
  await pg.query(
    'UPDATE "Otp" SET "expiresAt"=NOW()-INTERVAL \'1 minute\' WHERE phone=$1',
    ["+8801712345678"],
  );
  assert.equal(
    (await call("otp/verify", { phone: "01712345678", code: "123456" }))
      .response.status,
    400,
  );
  await pg.query('DELETE FROM "Otp"');
  assert.equal((await call("profile", profile)).response.status, 400);
  assert.equal(
    (
      await call(
        "profile",
        { ...profile, districtId: "district:64" },
        one.cookie,
      )
    ).response.status,
    400,
  );
  assert.equal(
    (await call("profile", profile, one.cookie)).response.status,
    200,
  );
  const donor = (
    await pg.query('SELECT * FROM "Donor" WHERE phone=$1', ["+8801712345678"])
  ).rows[0];
  const search = await (
    await fetch(base + "/find-donors?bloodGroup=A%2B")
  ).text();
  assert.ok(search.includes(profile.name));
  assert.ok(!search.includes("01712345678"));
  assert.ok(!search.includes("+8801712345678"));
  assert.equal(
    (await call("contact", { publicId: donor.publicId })).data.phone,
    "+8801712345678",
  );
  const second = await login("01812345678");
  const submissionId = crypto.randomUUID();
  assert.equal(
    (
      await call(
        "donations",
        {
          date: "2020-01-02",
          hospital: "Private fixture",
          note: "PRIVATE NOTE FIXTURE",
          submissionId,
        },
        one.cookie,
      )
    ).response.status,
    200,
  );
  assert.equal(
    (await call("donations", { date: "2020-01-02", submissionId }, one.cookie))
      .response.status,
    200,
  );
  let saved = (
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
    (await call("donations", { id: saved[0].id }, second.cookie, "DELETE"))
      .response.status,
    200,
  );
  assert.equal(
    (
      await pg.query('SELECT COUNT(*) FROM "Donation" WHERE "donorId"=$1', [
        donor.id,
      ])
    ).rows[0].count,
    "1",
  );
  assert.equal(
    (
      await call(
        "donations",
        { id: saved[0].id, date: "2021-01-01", submissionId },
        one.cookie,
      )
    ).response.status,
    200,
  );
  let aggregate = (
    await pg.query(
      'SELECT "donationCount","lastDonation"::text AS "lastDonation" FROM "Donor" WHERE id=$1',
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
        one.cookie,
      )
    ).response.status,
    400,
  );
  const publicProfile = await (
    await fetch(base + "/donors/" + donor.publicId)
  ).text();
  assert.ok(!publicProfile.includes("PRIVATE NOTE FIXTURE"));
  assert.ok(!publicProfile.includes("Private fixture"));
  await call(
    "profile",
    { ...profile, consent: false, visible: false },
    one.cookie,
  );
  assert.equal(
    (await call("contact", { publicId: donor.publicId })).response.status,
    404,
  );
  assert.equal((await fetch(base + "/donors/" + donor.publicId)).status, 404);
  await call("profile", profile, one.cookie);
  await call("donations", { id: saved[0].id }, one.cookie, "DELETE");
  aggregate = (
    await pg.query(
      'SELECT "donationCount","lastDonation"::text AS "lastDonation" FROM "Donor" WHERE id=$1',
      [donor.id],
    )
  ).rows[0];
  assert.equal(aggregate.donationCount, 0);
  assert.equal(aggregate.lastDonation, null);
  await pg.query('UPDATE "Otp" SET "sentAt"=NOW()-INTERVAL \'2 minutes\'');
  const change = await call(
    "otp/send",
    { phone: "01912345678", purpose: "change" },
    one.cookie,
  );
  assert.equal(change.response.status, 200);
  const changed = await call(
    "otp/verify",
    { phone: "01912345678", code: change.data.devCode, purpose: "change" },
    one.cookie,
  );
  assert.equal(changed.response.status, 200);
  assert.equal(
    (await call("profile", profile, one.cookie)).response.status,
    400,
  );
  const reused = await login("01912345678");
  assert.equal(
    (
      await pg.query('SELECT COUNT(*) FROM "Donor" WHERE phone=$1', [
        "+8801912345678",
      ])
    ).rows[0].count,
    "1",
  );
  await call("account", { confirm: "DELETE" }, reused.cookie, "DELETE");
  assert.equal((await fetch(base + "/donors/" + donor.publicId)).status, 404);
  console.log(
    "PASS: anonymous search; phone-free HTML; real OTP consumption/expiry/cooldown; hierarchy validation; auth; ownership; aggregate add/edit/delete; consent withdrawal; hidden URL; phone replacement; unique account; deletion.",
  );
  const browser = await chromium.launch({
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {}),
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(base);
  await page.getByLabel("Blood group", { exact: false }).selectOption("A+");
  await page.getByLabel("Division", { exact: true }).selectOption("division:1");
  await page.getByLabel("District", { exact: true }).selectOption("district:1");
  await page
    .getByLabel("Upazila / Thana", { exact: true })
    .selectOption("upazila:1");
  await page.getByLabel("Division", { exact: true }).selectOption("division:6");
  assert.equal(
    await page.getByLabel("District", { exact: true }).inputValue(),
    "",
  );
  assert.equal(
    await page.getByLabel("Upazila / Thana", { exact: true }).inputValue(),
    "",
  );
  assert.equal(
    await page.getByLabel("Union / Ward / Area", { exact: true }).inputValue(),
    "",
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  await page.screenshot({ path: "/tmp/jibondrop-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base);
  await page.screenshot({ path: "/tmp/jibondrop-desktop.png", fullPage: true });
  await page.keyboard.press("Tab");
  assert.equal(await page.locator(":focus").textContent(), "Skip to content");
  await browser.close();
  console.log(
    "PASS: mobile overflow, cascading parent resets, keyboard skip link; mobile and desktop screenshots.",
  );
  await pg.query('DELETE FROM "RateLimit"');
  const attempts = await call("otp/send", { phone: "01612345678" });
  assert.equal(attempts.response.status, 200);
  for (let i = 0; i < 5; i++)
    assert.equal(
      (await call("otp/verify", { phone: "01612345678", code: "000000" }))
        .response.status,
      400,
    );
  assert.equal(
    (
      await call("otp/verify", {
        phone: "01612345678",
        code: attempts.data.devCode,
      })
    ).response.status,
    400,
  );
  const attemptRow = (await pg.query('SELECT attempts FROM "Otp"')).rows[0];
  assert.equal(attemptRow.attempts, 5);
  await pg.query('DELETE FROM "RateLimit"');
  for (let i = 0; i < 20; i++)
    assert.equal(
      (await call("contact", { publicId: "absent-fixture" })).response.status,
      404,
    );
  assert.equal(
    (await call("contact", { publicId: "absent-fixture" })).response.status,
    400,
  );
  console.log(
    "PASS: maximum OTP attempts and persistent anonymous-contact rate limit.",
  );
  await pg.query('TRUNCATE "Donor", "Otp", "RateLimit" CASCADE');
  await pg.end();
}
main().catch(async (e) => {
  console.error(e);
  await pg.end();
  process.exit(1);
});
