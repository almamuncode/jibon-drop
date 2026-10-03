"use client";

import { useEffect, useRef } from "react";
import { Settings } from "lucide-react";
import { LanguageToggle, useTranslation } from "./language";
import { ThemeToggle } from "./theme-toggle";

export function MenuPreferences() {
  const t = useTranslation();
  return (
    <div className="menu-preferences">
      <div className="menu-preference-row">
        <span>{t("Language")}</span>
        <LanguageToggle />
      </div>
      <div className="menu-preference-row">
        <span>{t("Appearance")}</span>
        <ThemeToggle />
      </div>
    </div>
  );
}

export function PreferencesMenu() {
  const t = useTranslation();
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (
        menu.current?.open &&
        event.target instanceof Node &&
        !menu.current.contains(event.target)
      )
        menu.current.open = false;
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);
  return (
    <details
      className="account-menu preferences-menu"
      ref={menu}
      onKeyDown={(event) => {
        if (event.key === "Escape" && menu.current) menu.current.open = false;
      }}
    >
      <summary aria-label={t("Preferences")} title={t("Preferences")}>
        <Settings size={20} aria-hidden="true" />
      </summary>
      <div className="account-dropdown">
        <MenuPreferences />
      </div>
    </details>
  );
}
