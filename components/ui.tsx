"use client";
import { useTranslation } from "@/components/language";

import Link from "next/link";
import Image from "next/image";
export function Avatar({ name, url }: { name: string; url: string | null }) {
  return (
    <div className="avatar">
      {url ? (
        <Image src={url} alt={name} width={72} height={72} unoptimized />
      ) : (
        name
          .split(" ")
          .slice(0, 2)
          .map((x) => x[0])
          .join("")
          .toUpperCase()
      )}
    </div>
  );
}
export function Notice({ children }: { children: React.ReactNode }) {
  return <div className="notice">{children}</div>;
}
export function DashboardNav() {
  const t = useTranslation();

  return (
    <nav className="tabs" aria-label={t("Dashboard")}>
      <Link href="/dashboard">{t("Overview")}</Link>
      <Link href="/dashboard/profile">{t("My profile")}</Link>
      <Link href="/dashboard/donations">{t("Donation records")}</Link>
      <Link href="/dashboard/settings">{t("Settings")}</Link>
    </nav>
  );
}
