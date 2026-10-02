import { getAuth, googleConfigured } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthForm } from "@/components/auth";
export default async function Register() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");
  return (
    <div className="container auth-shell">
      <div className="auth-card">
        <span className="eyebrow">Join the donor directory</span>
        <h1>Become a blood donor</h1>
        <p>
          Create an account or continue with Google. Then add your contact
          number, blood group and location.
        </p>
        <AuthForm register googleEnabled={googleConfigured()} />
        <p className="muted">
          Already registered? <Link href="/login">Log in</Link>. You choose
          whether your profile is listed and your number is shared.
        </p>
      </div>
    </div>
  );
}
