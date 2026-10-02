"use client";
import { createContext, useContext, useState } from "react";
import { type Locale, translator } from "@/lib/i18n";
const LanguageContext = createContext<Locale>("bn");
export function LanguageProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <LanguageContext.Provider value={locale}>
      {children}
    </LanguageContext.Provider>
  );
}
export function useLocale() {
  return useContext(LanguageContext);
}
export function useTranslation() {
  return translator(useLocale());
}
export function LanguageToggle() {
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  return (
    <div
      className="language-toggle"
      role="group"
      aria-label={locale === "bn" ? "ভাষা বেছে নিন" : "Choose language"}
    >
      {(["bn", "en"] as const).map((value) => (
        <button
          key={value}
          type="button"
          lang={value}
          aria-pressed={locale === value}
          disabled={busy}
          onClick={() => {
            if (value === locale) return;
            setBusy(true);
            document.cookie = `jibondrop-language=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
            window.location.reload();
          }}
        >
          {value.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
