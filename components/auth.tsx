"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
export function AuthForm({
  register = false,
  googleEnabled = false,
}: {
  register?: boolean;
  googleEnabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function google() {
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard/profile",
        errorCallbackURL: "/login?error=google",
      });
      if (result.error)
        throw new Error(result.error.message || "Google sign-in failed.");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className="button secondary full"
        disabled={busy || !googleEnabled}
        onClick={google}
      >
        Continue with Google
      </button>
      {!googleEnabled && (
        <p className="muted">
          Google sign-in will be available once it is configured. You can use
          email and password below.
        </p>
      )}
      <p className="auth-divider">
        or {register ? "create an account" : "sign in with your password"}
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const f = new FormData(e.currentTarget);
          try {
            let result;
            if (register) {
              if (f.get("password") !== f.get("confirmPassword"))
                throw new Error("Passwords do not match.");
              result = await authClient.signUp.email({
                name: String(f.get("name")).trim(),
                email: String(f.get("email")).trim().toLowerCase(),
                username: String(f.get("username")).trim().toLowerCase(),
                password: String(f.get("password")),
              });
            } else {
              const identifier = String(f.get("identifier"))
                .trim()
                .toLowerCase();
              result = identifier.includes("@")
                ? await authClient.signIn.email({
                    email: identifier,
                    password: String(f.get("password")),
                  })
                : await authClient.signIn.username({
                    username: identifier,
                    password: String(f.get("password")),
                  });
            }
            if (result.error)
              throw new Error(
                register
                  ? result.error.message || "Unable to create account."
                  : "Invalid email, username or password.",
              );
            router.push(register ? "/dashboard/profile" : "/dashboard");
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {register ? (
          <>
            <label htmlFor="auth-name">Full name</label>
            <input
              id="auth-name"
              name="name"
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
            />
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
            />
            <label htmlFor="auth-username">Username</label>
            <input
              id="auth-username"
              name="username"
              required
              minLength={3}
              maxLength={30}
              pattern="[A-Za-z0-9_]+"
              autoComplete="username"
              aria-describedby="username-help"
            />
            <p id="username-help" className="muted">
              3–30 letters, numbers or underscores. Usernames are
              case-insensitive.
            </p>
          </>
        ) : (
          <>
            <label htmlFor="identifier">Email or username</label>
            <input
              id="identifier"
              name="identifier"
              required
              autoComplete="username"
            />
          </>
        )}
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={register ? 10 : undefined}
          maxLength={128}
          autoComplete={register ? "new-password" : "current-password"}
        />
        {register && (
          <>
            <p className="muted">
              Use at least 10 characters. Your password is stored as a secure
              hash.
            </p>
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
            />
          </>
        )}
        <button className="button full" disabled={busy}>
          {busy ? "Please wait…" : register ? "Create account" : "Log in"}
        </button>
        <p role="alert" className="error">
          {error}
        </p>
      </form>
    </>
  );
}
