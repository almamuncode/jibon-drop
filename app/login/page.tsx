import Link from "next/link";
import { AuthForm } from "@/components/auth";
export default function Login() {
  return (
    <div className="container auth-shell">
      <div className="auth-card">
        <span className="eyebrow">Welcome back</span>
        <h1>Your next act of kindness starts here.</h1>
        <p>Log in securely with your mobile number. No password needed.</p>
        <AuthForm />
        <p className="muted">
          New here? <Link href="/register">Become a donor</Link>
        </p>
      </div>
    </div>
  );
}
