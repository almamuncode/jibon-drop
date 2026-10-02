"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  UserRound,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { Avatar } from "./ui";
import { authClient } from "@/lib/auth-client";

export function AccountMenu({
  name,
  email,
  image,
  isAdmin = false,
}: {
  name: string;
  email: string;
  image: string | null;
  isAdmin?: boolean;
}) {
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
      <summary aria-label="Open account options">
        <Avatar name={name} url={image} />
        <ChevronDown size={15} aria-hidden="true" />
      </summary>
      <div className="account-dropdown">
        <div className="account-dropdown-heading">
          <strong>{name}</strong>
          <span>{email}</span>
        </div>
        {[
          ...(isAdmin
            ? [{ href: "/admin", label: "Administration", icon: Settings }]
            : []),
          { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { href: "/dashboard/profile", label: "My profile", icon: UserRound },
          { href: "/dashboard/settings", label: "Settings", icon: Settings },
        ].map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} onClick={close}>
            <Icon size={18} />
            {label}
          </Link>
        ))}
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const result = await authClient.signOut();
              if (result.error)
                throw new Error(result.error.message || "Unable to log out.");
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
          {busy ? "Logging out…" : "Log out"}
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
    </details>
  );
}
