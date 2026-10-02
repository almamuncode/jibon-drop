import { type Locale, translator } from "./i18n";
export function dateLabel(value: Date | string | null, locale: Locale = "bn") {
  return value
    ? new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
        timeZone: "Asia/Dhaka",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : translator(locale)("Not recorded");
}
