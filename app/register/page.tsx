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
          First, verify your mobile number. Then add your name, blood group and
          location. A photo is optional.
        </p>
        <AuthForm />
        <p className="muted">
          You choose whether your profile is listed and your number is shared.
        </p>
      </div>
    </div>
  );
}
