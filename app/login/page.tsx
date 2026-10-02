import { getAuth, googleConfigured } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthForm } from "@/components/auth";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");
  const error = (await searchParams).error;
  return (
    <div className="container auth-shell">
      <div className="auth-card">
        <span className="eyebrow">Welcome back</span>
        <h1>Log in to JibonDrop</h1>
        <p>Sign in with Google, or use your email or username and password.</p>
        {error && (
          <p className="error" role="alert">
            Google sign-in could not be completed. Try again or use your
            password.
          </p>
        )}
        <AuthForm googleEnabled={googleConfigured()} />
        <p className="muted">
          New here? <Link href="/register">Become a donor</Link>
        </p>
      </div>
    </div>
  );
}
