import { redirect } from "next/navigation";
import { currentDonor } from "@/lib/security";
import { DashboardNav } from "@/components/ui";
export const dynamic = "force-dynamic";
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await currentDonor())) redirect("/login");
  return (
    <div className="container">
      <DashboardNav />
      {children}
    </div>
  );
}
