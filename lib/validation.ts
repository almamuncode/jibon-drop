import { z } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
export const bloodGroups = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
] as const;
export function normalizePhone(input: string) {
  const digits = input
    .replace(/[০-৯]/g, (c) => String("০১২৩৪৫৬৭৮৯".indexOf(c)))
    .replace(/[\s()-]/g, "");
  const phone = parsePhoneNumberFromString(
    digits.startsWith("00880") ? "+" + digits.slice(2) : digits,
    "BD",
  );
  if (
    !phone ||
    phone.country !== "BD" ||
    !phone.isValid() ||
    phone.getType() !== "MOBILE"
  )
    throw new Error("Enter a valid Bangladesh mobile number.");
  return phone.number.toString();
}
export const profileSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().min(1).max(40),
    bloodGroup: z.enum(bloodGroups),
    divisionId: z.string().min(1),
    districtId: z.string().min(1),
    localityId: z.string().nullable(),
    areaId: z.string().nullable(),
    fallbackArea: z.string().trim().max(120).nullable(),
    available: z.boolean(),
    visible: z.boolean(),
    consent: z.boolean(),
  })
  .refine((v) => !v.visible || v.consent, {
    message: "Contact-sharing consent is required for a public listing.",
  });
export function dhakaToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export const donationSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
      (v) =>
        !isNaN(Date.parse(v)) &&
        new Date(v).toISOString().slice(0, 10) === v &&
        v <= dhakaToday(),
      "Choose a valid date that is not in the future.",
    ),
  hospital: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
  submissionId: z.string().uuid(),
});

export const registrationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().trim().toLowerCase().max(254),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/),
  password: z.string().min(10).max(128),
});
