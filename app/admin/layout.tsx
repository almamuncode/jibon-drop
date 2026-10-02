import Link from "next/link";
import { notFound } from "next/navigation";
import { currentAdmin } from "@/lib/admin";
export const dynamic = "force-dynamic";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await currentAdmin())) notFound();
  return (
    <div className="container">
      <nav className="dashboard-nav" aria-label="Administration">
        <Link href="/admin">Users</Link>
        <Link href="/admin/audit">Activity log</Link>
        <Link href="/dashboard">My dashboard</Link>
      </nav>
      {children}
    </div>
  );
}
