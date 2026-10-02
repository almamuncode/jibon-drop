"use client";
import { useTranslation } from "@/components/language";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UnreadBadge } from "@/components/notifications";
import { Home, Search, Heart, UserRound, ClipboardList } from "lucide-react";

export function MobileNav({
  signedIn,
  unreadNotifications = 0,
}: {
  signedIn: boolean;
  unreadNotifications?: number;
}) {
  const t = useTranslation();

  const pathname = usePathname();
  return (
    <nav className="mobile-nav" aria-label={t("Mobile navigation")}>
      {[
        { href: "/", label: t("Home"), icon: Home },
        { href: "/find-donors", label: t("Find donors"), icon: Search },
        signedIn
          ? {
              href: "/dashboard/donations",
              label: t("Donations"),
              icon: ClipboardList,
            }
          : { href: "/register", label: t("Join"), icon: Heart },
        { href: "/dashboard", label: t("My account"), icon: UserRound },
      ].map(({ href, label, icon: Icon }) => {
        const active =
          href === "/"
            ? pathname === "/"
            : href === "/dashboard"
              ? pathname.startsWith(href) &&
                !pathname.startsWith("/dashboard/donations")
              : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={21} aria-hidden="true" />
            <span>{label}</span>
            {signedIn && href === "/dashboard" && (
              <UnreadBadge initial={unreadNotifications} />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
