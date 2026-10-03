"use client";
import { useTranslation } from "@/components/language";

import { Moon, Sun } from "lucide-react";
import { useEffect, useRef } from "react";

export function ThemeToggle() {
  const t = useTranslation();

  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem("jibondrop-theme");
      } catch {}
      const dark = saved === "dark" || (saved !== "light" && media.matches);
      if (input.current) input.current.checked = dark;
      document.documentElement.dataset.theme = dark ? "dark" : "light";
    };
    sync();
    media.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    window.addEventListener("pageshow", sync);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("pageshow", sync);
    };
  }, []);

  return (
    <label className="appearance-toggle" title={t("Toggle dark mode")}>
      <input
        ref={input}
        id="theme-switch"
        type="checkbox"
        role="switch"
        aria-label={t("Dark mode")}
        onChange={(event) => {
          const theme = event.currentTarget.checked ? "dark" : "light";
          document.documentElement.dataset.theme = theme;
          try {
            localStorage.setItem("jibondrop-theme", theme);
          } catch {}
        }}
      />
      <span className="appearance-light" aria-hidden="true">
        {t("Light")}
      </span>
      <span className="appearance-dark" aria-hidden="true">
        {t("Dark")}
      </span>
      <span className="appearance-track" aria-hidden="true">
        <Sun size={14} />
        <Moon size={14} />
        <span className="appearance-thumb" />
      </span>
    </label>
  );
}
