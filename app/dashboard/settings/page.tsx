import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailConfigured } from "@/lib/email";
import { AccountSettings } from "@/components/account-settings";
import { AccountActions } from "@/components/dashboard";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const passwordAccount = await db().account.findFirst({
    where: {
      userId: session.user.id,
      providerId: "credential",
      password: { not: null },
    },
    select: { id: true },
  });
  return (
    <div className="editor-width">
      <div className="page-intro">
        <span className="eyebrow">Account preferences</span>
        <h1>Settings</h1>
        <p>Manage how you sign in and keep your account secure.</p>
      </div>
      <AccountSettings
        email={session.user.email}
        hasPassword={!!passwordAccount}
        emailEnabled={emailConfigured()}
      />
      <section className="dashboard-panel">
        <h2>Account management</h2>
        <p>Sign out of this device or permanently delete your account.</p>
        <AccountActions />
      </section>
    </div>
  );
}
