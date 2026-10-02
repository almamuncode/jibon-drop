import { getTranslation } from "@/lib/i18n-server";
import Link from "next/link";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AccountMenu } from "./account-menu";
import { MobileNav } from "./mobile-nav";
import { cache } from "react";

const navigationSession = cache(async () => {
  const requestHeaders = await headers();
  return requestHeaders.get("cookie")
    ? await getAuth().api.getSession({ headers: requestHeaders })
    : null;
});

export async function MobileNavigation() {
  const session = await navigationSession();
  return <MobileNav signedIn={!!session} />;
}

export async function AuthNavigation() {
  const t = await getTranslation();

  const session = await navigationSession();
  if (!session)
    return (
      <>
        <Link className="nav-donor" href="/register">
          {t("Become a Donor")}{" "}
        </Link>
        <Link href="/login">{t("Login")}</Link>
      </>
    );
  const user = await db().user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  const donor = await db().donor.findUnique({
    where: { userId: session.user.id },
    select: {
      name: true,
      imageUrl: true,
      _count: { select: { contactRequests: { where: { status: "PENDING" } } } },
    },
  });
  return (
    <AccountMenu
      isAdmin={user?.role === "ADMIN"}
      pendingRequests={donor?._count.contactRequests || 0}
      name={donor?.name || session.user.name}
      email={session.user.email}
      image={donor?.imageUrl || session.user.image || null}
    />
  );
}
