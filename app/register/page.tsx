import { getTranslation } from "@/lib/i18n-server";
import { getAuth, googleConfigured } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthForm } from "@/components/auth";
export default async function Register() {
  const t = await getTranslation();

  const session = await getAuth().api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");
  return (
    <div className="container auth-shell">
      <div className="auth-card">
        <span className="eyebrow">{t("Join the donor directory")}</span>
        <h1>{t("Become a blood donor")}</h1>
        <p>
          {t(
            "Create an account or continue with Google. Then add your contact number, blood group and location.",
          )}{" "}
        </p>
        <AuthForm register googleEnabled={googleConfigured()} />
        <p className="muted">
          {t("Already registered?")} <Link href="/login">{t("Log in")}</Link>
          {t(
            ". You choose whether your profile is listed and your number is shared.",
          )}{" "}
        </p>
      </div>
    </div>
  );
}
