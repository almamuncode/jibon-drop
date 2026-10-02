"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useRef } from "react";

export function ThemeToggle() {
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
    <label className="theme-toggle" title="Toggle dark mode">
      <input
        ref={input}
        id="theme-switch"
        type="checkbox"
        role="switch"
        aria-label="Dark mode"
        onChange={(event) => {
          const theme = event.currentTarget.checked ? "dark" : "light";
          document.documentElement.dataset.theme = theme;
          try {
            localStorage.setItem("jibondrop-theme", theme);
          } catch {}
        }}
      />
      <Sun className="theme-sun" size={18} aria-hidden="true" />
      <Moon className="theme-moon" size={18} aria-hidden="true" />
      <span className="theme-sun" aria-hidden="true">
        Light
      </span>
      <span className="theme-moon" aria-hidden="true">
        Dark
      </span>
    </label>
  );
}
