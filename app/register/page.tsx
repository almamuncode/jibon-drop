import { googleConfigured } from "@/lib/auth";
import Link from "next/link";
import { AuthForm } from "@/components/auth";
export default function Register() {
  return (
    <div className="container auth-shell">
      <div className="auth-card">
        <span className="eyebrow">Join the donor directory</span>
        <h1>
          A little of you.
          <br />A lot of hope.
        </h1>
        <p>
          Create an account or continue with Google. Then add your contact
          number, blood group and location. No SMS is required.
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
