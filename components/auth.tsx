"use client";
import { useTranslation } from "@/components/language";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
export function AuthForm({
  register = false,
  googleEnabled = false,
}: {
  register?: boolean;
  googleEnabled?: boolean;
}) {
  const t = useTranslation();

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
        throw new Error(result.error.message || t("Google sign-in failed."));
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className="button secondary full google-button"
        disabled={busy || !googleEnabled}
        onClick={google}
      >
        <svg
          className="google-logo"
          width="20"
          height="20"
          viewBox="0 0 48 48"
          aria-hidden="true"
          focusable="false"
        >
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.17 7.09-10.32 7.09-17.65Z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59A14.41 14.41 0 0 1 9.75 24c0-1.59.27-3.13.78-4.59l-7.98-6.19A23.87 23.87 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
          />
        </svg>
        {t("Continue with Google")}{" "}
      </button>
      {!googleEnabled && (
        <p className="muted">
          {t(
            "Google sign-in will be available once it is configured. You can use email and password below.",
          )}{" "}
        </p>
      )}
      <p className="auth-divider">
        {t("or")}{" "}
        {register ? t("create an account") : t("sign in with your password")}
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
                throw new Error(t("Passwords do not match."));
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
                  ? result.error.message || t("Unable to create account.")
                  : t("Invalid email, username or password."),
              );
            // Reload with the new session cookie and clear guest page caches.
            window.location.replace(
              register ? "/dashboard/profile" : "/dashboard",
            );
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {register ? (
          <>
            <label htmlFor="auth-name">{t("Full name")}</label>
            <input
              id="auth-name"
              name="name"
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
            />
            <label htmlFor="auth-email">{t("Email")}</label>
            <input
              id="auth-email"
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
            />
            <label htmlFor="auth-username">{t("Username")}</label>
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
              {t(
                "3–30 letters, numbers or underscores. Usernames are case-insensitive.",
              )}{" "}
            </p>
          </>
        ) : (
          <>
            <label htmlFor="identifier">{t("Email or username")}</label>
            <input
              id="identifier"
              name="identifier"
              required
              autoComplete="username"
            />
          </>
        )}
        <label htmlFor="password">{t("Password")}</label>
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
              {t(
                "Use at least 10 characters. Your password is stored as a secure hash.",
              )}{" "}
            </p>
            <label htmlFor="confirmPassword">{t("Confirm password")}</label>
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
          {busy
            ? t("Please wait…")
            : register
              ? t("Create account")
              : t("Log in")}
        </button>
        <p role="alert" className="error">
          {t.error(error)}
        </p>
      </form>
    </>
  );
}
