import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const base = process.env.TEST_APP_URL || "http://localhost:3002";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error(
    "Tests require a local application against the isolated test database.",
  );
async function main() {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {}),
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(base);
    assert.equal(await page.locator("html").getAttribute("lang"), "en");
    await page
      .getByRole("heading", {
        name: "A little of you. A lifeline for someone.",
      })
      .waitFor();
    await page.getByRole("button", { name: "BN", exact: true }).click();
    await page.waitForFunction(() => document.documentElement.lang === "bn");
    await page
      .getByRole("heading", {
        name: "আপনার সামান্য দান। কারও বেঁচে থাকার আশা।",
      })
      .waitFor();
    assert.equal(await page.locator("html").getAttribute("lang"), "bn");
    assert.equal(
      await page
        .getByRole("button", { name: "BN", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.screenshot({
      path: "/tmp/jibondrop-bangla-mobile.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await page.waitForFunction(() => document.documentElement.lang === "en");
    await page
      .getByRole("heading", {
        name: "A little of you. A lifeline for someone.",
      })
      .waitFor();
    await page.goto(base + "/register");
    await page.getByLabel("Full name", { exact: true }).waitFor();
    await page.getByRole("button", { name: "BN", exact: true }).click();
    await page.waitForFunction(() => document.documentElement.lang === "bn");
    await page.getByLabel("পুরো নাম", { exact: true }).fill("Language Fixture");
    const suffix = Date.now();
    await page
      .getByLabel("ইমেইল", { exact: true })
      .fill(`language-${suffix}@example.com`);
    await page
      .getByLabel("ব্যবহারকারীর নাম", { exact: true })
      .fill(`language_${suffix}`);
    await page
      .getByLabel("পাসওয়ার্ড", { exact: true })
      .fill("isolated-Language-password-42");
    await page
      .getByLabel("পাসওয়ার্ড আবার দিন", { exact: true })
      .fill("isolated-Language-password-42");
    await page
      .getByRole("button", { name: "অ্যাকাউন্ট তৈরি করুন", exact: true })
      .click();
    await page.waitForURL("**/dashboard/profile");
    await page
      .getByRole("heading", { name: "আমার রক্তদাতা প্রোফাইল", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "প্রোফাইল পরিবর্তন করুন", exact: true })
      .click();
    await page
      .getByLabel("যোগাযোগের মোবাইল নম্বর", { exact: true })
      .fill("01912345678");
    await page.getByLabel("রক্তের গ্রুপ", { exact: true }).selectOption("B+");
    await page.getByLabel("বিভাগ", { exact: true }).selectOption("division:1");
    await page.getByLabel("জেলা", { exact: true }).selectOption("district:1");
    await page
      .getByLabel("উপজেলা / থানা", { exact: true })
      .selectOption("upazila:1");
    const options = await page.locator("#divisionId option").allTextContents();
    assert.ok(!options.some((text) => text.includes(" · ")));
    await page
      .getByRole("button", { name: "প্রোফাইল সংরক্ষণ করুন", exact: true })
      .click();
    await page
      .getByText("প্রোফাইল সংরক্ষিত হয়েছে।", { exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "আমার প্রোফাইল মুছে ফেলুন", exact: true })
      .click();
    const input = await page.getByLabel("মুছে ফেলার নিশ্চিতকরণ").boundingBox();
    const button = await page
      .getByRole("button", {
        name: "আমার প্রোফাইল স্থায়ীভাবে মুছে ফেলুন",
        exact: true,
      })
      .boundingBox();
    assert.ok(input && button && button.y - (input.y + input.height) >= 15);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.screenshot({
      path: "/tmp/jibondrop-bangla-profile-mobile.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await page.waitForFunction(() => document.documentElement.lang === "en");
    await page
      .getByRole("heading", { name: "My donor profile", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Change profile", exact: true })
      .click();
    await page.getByLabel("Contact mobile number", { exact: true }).waitFor();
    await page.reload();
    assert.equal(await page.locator("html").getAttribute("lang"), "en");
    await page.setViewportSize({ width: 320, height: 700 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(base);
    await page.screenshot({
      path: "/tmp/jibondrop-english-desktop.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "PASS: default English; BN/EN switching and persistence; Bangla registration and profile save; single-language locations; deletion spacing; mobile bounds; no browser errors.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
