import { describe, expect, it } from "vitest";
import { profileSchema } from "../lib/validation";
import { publicSelect } from "../lib/public";
const schema = {
  safeParse: (value: object) =>
    profileSchema.safeParse({
      name: "Test Donor",
      phone: "01712345678",
      bloodGroup: "A+",
      divisionId: "division",
      districtId: "district",
      localityId: null,
      areaId: null,
      fallbackArea: "Area",
      available: true,
      visible: false,
      consent: false,
      ...value,
    }),
};
describe("private profile birth date and weight", () => {
  it("accepts optional fields, clearing, leap dates and decimal kilograms", () => {
    for (const value of [
      {},
      { dateOfBirth: null, weightKg: null },
      { dateOfBirth: "2000-02-29", weightKg: 65.5 },
    ])
      expect(schema.safeParse(value).success).toBe(true);
  });
  it("rejects impossible, future and malformed birth dates", () => {
    for (const dateOfBirth of [
      "2001-02-29",
      "2099-01-01",
      "01/02/2000",
      "1899-01-01",
    ])
      expect(schema.safeParse({ dateOfBirth }).success).toBe(false);
  });
  it("rejects nonpositive, nonnumeric and excessive weights", () => {
    for (const weightKg of [0, -5, 501, "65", Infinity, NaN])
      expect(schema.safeParse({ weightKg }).success).toBe(false);
  });
  it("excludes birth dates and weight from public donor data", () => {
    expect(publicSelect).not.toHaveProperty("dateOfBirth");
    expect(publicSelect).not.toHaveProperty("weightKg");
  });
});
