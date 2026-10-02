import { describe, it, expect } from "vitest";
import sharp from "sharp";
import {
  normalizePhone,
  donationSchema,
  dhakaToday,
  mockEnabled,
  profileSchema,
  bloodGroups,
} from "../lib/validation";
import { validateImage } from "../lib/image";
import { publicSelect } from "../lib/public";
import { loadLocations } from "../scripts/locations";
describe("phone ownership inputs", () => {
  it("canonicalizes local, international and Bangla digits", () => {
    for (const value of [
      "01712345678",
      "+8801712345678",
      "008801712345678",
      "০১৭১২৩৪৫৬৭৮",
    ])
      expect(normalizePhone(value)).toBe("+8801712345678");
  });
  it("rejects foreign, invalid and landline numbers", () => {
    for (const phone of ["123", "+14155552671", "029876543"])
      expect(() => normalizePhone(phone)).toThrow();
  });
});
describe("donation calendar", () => {
  it("uses Bangladesh midnight", () =>
    expect(dhakaToday(new Date("2026-10-01T18:01:00Z"))).toBe("2026-10-02"));
  it("rejects future and impossible dates", () => {
    for (const date of ["2099-01-01", "2025-02-30"])
      expect(
        donationSchema.safeParse({ date, submissionId: crypto.randomUUID() })
          .success,
      ).toBe(false);
  });
  it("accepts backfilled calendar dates", () =>
    expect(
      donationSchema.safeParse({
        date: "2020-02-29",
        submissionId: crypto.randomUUID(),
      }).success,
    ).toBe(true));
});
describe("public privacy and production safeguards", () => {
  it("never projects phone, private notes or fallback", () => {
    for (const key of [
      "phone",
      "phoneVerifiedAt",
      "fallbackArea",
      "donations",
      "sessions",
    ])
      expect(publicSelect).not.toHaveProperty(key);
  });
  it("forbids production mock even when enabled", () =>
    expect(() =>
      mockEnabled({
        NODE_ENV: "production",
        SMS_PROVIDER: "mock",
        ENABLE_DEV_OTP: "true",
      }),
    ).toThrow());
  it("requires explicitly enabled development mock", () => {
    expect(mockEnabled({ NODE_ENV: "development", SMS_PROVIDER: "mock" })).toBe(
      false,
    );
    expect(
      mockEnabled({
        NODE_ENV: "development",
        SMS_PROVIDER: "mock",
        ENABLE_DEV_OTP: "true",
      }),
    ).toBe(true);
  });
  it("requires consent for publication", () =>
    expect(
      profileSchema.safeParse({
        name: "Donor",
        bloodGroup: "A+",
        divisionId: "x",
        districtId: "y",
        localityId: null,
        areaId: null,
        fallbackArea: "Local area",
        visible: true,
        available: true,
        consent: false,
      }).success,
    ).toBe(false));
  it("has exactly the eight requested groups", () =>
    expect(bloodGroups).toHaveLength(8));
});
describe("location import", () => {
  it("validates all source rows and parent links", () => {
    const rows = loadLocations();
    expect(rows.filter((r) => r.type === "DIVISION")).toHaveLength(8);
    expect(rows.filter((r) => r.type === "DISTRICT")).toHaveLength(64);
    expect(rows.length).toBeGreaterThan(5000);
  });
});
describe("server image decoding", () => {
  it("rejects oversized and disguised files", async () => {
    await expect(validateImage(Buffer.alloc(100001))).rejects.toThrow();
    await expect(validateImage(Buffer.from("<svg></svg>"))).rejects.toThrow();
  });
  it("strips metadata and stores static webp below the limit", async () => {
    const image = await sharp({
      create: { width: 512, height: 512, channels: 3, background: "#a51e36" },
    })
      .png()
      .toBuffer();
    const clean = await validateImage(image);
    expect(clean.length).toBeLessThanOrEqual(100000);
    expect((await sharp(clean).metadata()).format).toBe("webp");
  });
});
