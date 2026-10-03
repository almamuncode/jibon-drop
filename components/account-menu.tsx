"use client";
import { useTranslation } from "@/components/language";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  UserRound,
  Settings,
  LogOut,
  ChevronDown,
  Heart,
  MessageCircle,
} from "lucide-react";
import { MenuPreferences } from "./menu-preferences";
import { Avatar } from "./ui";
import { authClient } from "@/lib/auth-client";
import { UnreadBadge } from "@/components/notifications";

export function AccountMenu({
  name,
  email,
  image,
  isAdmin = false,
  pendingRequests = 0,
  unreadNotifications = 0,
}: {
  name: string;
  email: string;
  image: string | null;
  isAdmin?: boolean;
  pendingRequests?: number;
  unreadNotifications?: number;
}) {
  const t = useTranslation();

  const menu = useRef<HTMLDetailsElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      const current = menu.current;
      if (
        current?.open &&
        event.target instanceof Node &&
        !current.contains(event.target)
      ) {
        current.open = false;
      }
    };
    document.addEventListener("pointerdown", closeOutside, true);
    return () =>
      document.removeEventListener("pointerdown", closeOutside, true);
  }, []);
  const close = () => {
    if (menu.current) menu.current.open = false;
  };
  return (
    <details
      className="account-menu"
      ref={menu}
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
    >
      <summary aria-label={t("Open account options")}>
        <Avatar name={name} url={image} />
        <UnreadBadge initial={unreadNotifications} />
        <ChevronDown size={15} aria-hidden="true" />
      </summary>
      <div className="account-dropdown">
        <div className="account-dropdown-heading">
          <strong>{name}</strong>
          <span>{email}</span>
        </div>
        {[
          ...(isAdmin
            ? [{ href: "/admin", label: t("Administration"), icon: Settings }]
            : []),
          { href: "/dashboard", label: t("Dashboard"), icon: LayoutDashboard },
          {
            href: "/dashboard/profile",
            label: t("My profile"),
            icon: UserRound,
          },
          {
            href: "/dashboard/donations",
            label: t("Donation records"),
            icon: Heart,
          },
          {
            href: "/dashboard/requests",
            label:
              t("Contact requests") +
              (pendingRequests ? ` (${pendingRequests})` : ""),
            icon: MessageCircle,
          },
          { href: "/dashboard/settings", label: t("Settings"), icon: Settings },
        ].map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} onClick={close}>
            <Icon size={18} />
            {label}
            {href === "/dashboard/requests" && (
              <UnreadBadge initial={unreadNotifications} />
            )}
          </Link>
        ))}
        <MenuPreferences />
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const result = await authClient.signOut();
              if (result.error)
                throw new Error(
                  result.error.message || t("Unable to log out."),
                );
              close();
              router.push("/");
              router.refresh();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <LogOut size={18} />
          {busy ? t("Logging out…") : t("Log out")}
        </button>
        {error && (
          <p className="error" role="alert">
            {t.error(error)}
          </p>
        )}
      </div>
    </details>
  );
}
