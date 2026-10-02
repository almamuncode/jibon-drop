import { expect, it } from "vitest";
import { normalizeLocale, translator } from "../lib/i18n";
import { dateLabel } from "../lib/format";
it("defaults to English and accepts only the two supported languages", () => {
  expect(normalizeLocale()).toBe("en");
  expect(normalizeLocale("fr")).toBe("en");
  expect(normalizeLocale("en")).toBe("en");
  expect(normalizeLocale("bn")).toBe("bn");
});
it("translates interface text while preserving user content and blood groups", () => {
  expect(translator("bn")("Save profile")).toBe("প্রোফাইল সংরক্ষণ করুন");
  expect(translator("en")("Save profile")).toBe("Save profile");
  expect(translator("bn")("A+")).toBe("A+");
  expect(translator("bn")("User-supplied hospital")).toBe(
    "User-supplied hospital",
  );
});
it("shows localized errors and date labels", () => {
  expect(
    translator("bn").error("Enter a valid Bangladesh mobile number."),
  ).toBe("বাংলাদেশের সঠিক মোবাইল নম্বর দিন।");
  expect(translator("bn").error("Unknown upstream error")).toMatch(
    /[\u0980-\u09FF]/,
  );
  expect(translator("en").error("Unknown upstream error")).toBe(
    "Unknown upstream error",
  );
  expect(dateLabel(null, "bn")).toBe("নথিভুক্ত হয়নি");
  expect(dateLabel("2026-10-02", "bn")).toMatch(/[০-৯]/);
  expect(dateLabel("2026-10-02", "en")).toBe("2 Oct 2026");
});
