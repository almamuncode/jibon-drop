"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Heart, UserRound, ClipboardList } from "lucide-react";

export function MobileNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {[
        { href: "/", label: "Home", icon: Home },
        { href: "/find-donors", label: "Find donors", icon: Search },
        signedIn
          ? {
              href: "/dashboard/donations",
              label: "Donations",
              icon: ClipboardList,
            }
          : { href: "/register", label: "Join", icon: Heart },
        { href: "/dashboard", label: "My account", icon: UserRound },
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
          </Link>
        );
      })}
    </nav>
  );
}
