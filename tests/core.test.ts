import { describe, it, expect } from "vitest";
import sharp from "sharp";
import {
  normalizePhone,
  donationSchema,
  dhakaToday,
  profileSchema,
  bloodGroups,
  registrationSchema,
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
  it("requires consent for publication", () =>
    expect(
      profileSchema.safeParse({
        name: "Donor",
        phone: "01712345678",
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

describe("account validation", () => {
  it("normalizes account identities without altering passwords", () => {
    const value = registrationSchema.parse({
      name: " Donor Name ",
      email: "User@Example.com",
      username: "Donor_USER",
      password: "Password with Spaces",
    });
    expect(value.email).toBe("user@example.com");
    expect(value.username).toBe("donor_user");
    expect(value.name).toBe("Donor Name");
    expect(value.password).toBe("Password with Spaces");
  });
  it("rejects short passwords and invalid usernames", () => {
    for (const override of [
      { password: "short" },
      { username: "bad name" },
      { name: "" },
    ])
      expect(
        registrationSchema.safeParse({
          name: "Donor",
          email: "donor@example.com",
          username: "donor_user",
          password: "a-safe-password",
          ...override,
        }).success,
      ).toBe(false);
  });
});
