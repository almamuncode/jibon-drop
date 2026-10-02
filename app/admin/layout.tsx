import { getTranslation } from "@/lib/i18n-server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentAdmin } from "@/lib/admin";
export const dynamic = "force-dynamic";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslation();

  if (!(await currentAdmin())) notFound();
  return (
    <div className="container">
      <nav className="dashboard-nav" aria-label={t("Administration")}>
        <Link href="/admin">{t("Users")}</Link>
        <Link href="/admin/audit">{t("Activity log")}</Link>
        <Link href="/dashboard">{t("My dashboard")}</Link>
      </nav>
      {children}
    </div>
  );
}
