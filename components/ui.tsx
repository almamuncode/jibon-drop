"use client";
import { useTranslation } from "@/components/language";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  UserRound,
  LayoutDashboard,
  Heart,
  MessageCircle,
  Settings,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { UnreadBadge } from "@/components/notifications";
export function Avatar({ name, url }: { name: string; url: string | null }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const photoUrl = url?.trim() || null;
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join("")
    .toUpperCase();
  return (
    <div className="avatar" role="img" aria-label={name || "User"}>
      {photoUrl && photoUrl !== failedUrl ? (
        <Image
          key={photoUrl}
          src={photoUrl}
          alt=""
          width={72}
          height={72}
          unoptimized
          onError={() => setFailedUrl(photoUrl)}
        />
      ) : (
        <span aria-hidden="true">{initials || <UserRound size={24} />}</span>
      )}
    </div>
  );
}
export function Notice({ children }: { children: React.ReactNode }) {
  return <div className="notice">{children}</div>;
}
export function DashboardNav() {
  const t = useTranslation();
  const pathname = usePathname();
  const items = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/profile", label: "My profile", icon: UserRound },
    { href: "/dashboard/donations", label: "Donation records", icon: Heart },
    {
      href: "/dashboard/requests",
      label: "Contact requests",
      icon: MessageCircle,
    },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ];
  return (
    <nav className="tabs dashboard-tabs" aria-label={t("Dashboard")}>
      {items.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/dashboard" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{t(label)}</span>
            {href === "/dashboard/requests" && <UnreadBadge />}
          </Link>
        );
      })}
    </nav>
  );
}
