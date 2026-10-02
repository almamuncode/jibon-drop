import { bangla } from "./translations";
export type Locale = "bn" | "en";
export function normalizeLocale(value?: string): Locale {
  return value === "en" ? "en" : "bn";
}
export function translator(locale: Locale) {
  const t = (text: string) => (locale === "bn" ? (bangla[text] ?? text) : text);
  return Object.assign(t, {
    error: (text: string) => {
      if (!text || locale === "en" || /[\u0980-\u09FF]/.test(text)) return text;
      return (
        bangla[text] ??
        "অনুরোধটি সম্পন্ন করা যায়নি। তথ্য যাচাই করে আবার চেষ্টা করুন।"
      );
    },
  });
}
