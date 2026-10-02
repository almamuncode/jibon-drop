"use client";

import { useState } from "react";
import { Mail, LockKeyhole } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function AccountSettings({
  email,
  hasPassword,
  emailEnabled,
}: {
  email: string;
  hasPassword: boolean;
  emailEnabled: boolean;
}) {
  const [emailMessage, setEmailMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  return (
    <>
      <form
        className="dashboard-panel settings-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const values = new FormData(form);
          setEmailBusy(true);
          setEmailMessage("");
          try {
            const result = await authClient.changeEmail({
              newEmail: String(values.get("email")).trim(),
              callbackURL: "/dashboard/settings",
            });
            if (result.error)
              throw new Error(
                result.error.message || "Unable to request an email change.",
              );
            setEmailMessage(
              "Check your email for the confirmation link. Your sign-in email stays the same until verification is complete.",
            );
            form.reset();
          } catch (e) {
            setEmailMessage((e as Error).message);
          } finally {
            setEmailBusy(false);
          }
        }}
      >
        <div className="settings-heading">
          <span className="step-icon">
            <Mail size={21} />
          </span>
          <div>
            <h2>Email address</h2>
            <p>
              Currently signed in as <strong>{email}</strong>
            </p>
          </div>
        </div>
        <label htmlFor="settings-email">New email address</label>
        <input
          id="settings-email"
          type="email"
          name="email"
          required
          autoComplete="email"
          maxLength={254}
          disabled={!emailEnabled || emailBusy}
          placeholder="you@example.com"
        />
        <p className="muted">
          We verify the new address before changing your sign-in email. Verified
          accounts also require approval from the current address.
        </p>
        {!emailEnabled && (
          <p className="notice">
            Email changes will be available once the site’s email delivery is
            configured.
          </p>
        )}
        <button className="button" disabled={!emailEnabled || emailBusy}>
          {emailBusy ? "Sending…" : "Change email"}
        </button>
        <p role="status">{emailMessage}</p>
      </form>
      <form
        className="dashboard-panel settings-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const values = new FormData(form);
          const newPassword = String(values.get("newPassword"));
          if (newPassword !== values.get("confirmation")) {
            setPasswordMessage("The new passwords do not match.");
            return;
          }
          setPasswordBusy(true);
          setPasswordMessage("");
          try {
            const result = await authClient.changePassword({
              currentPassword: String(values.get("currentPassword")),
              newPassword,
              revokeOtherSessions: true,
            });
            if (result.error)
              throw new Error(
                result.error.message || "Unable to change your password.",
              );
            form.reset();
            setPasswordMessage(
              "Password updated. Other signed-in sessions have been logged out.",
            );
          } catch (e) {
            setPasswordMessage((e as Error).message);
          } finally {
            setPasswordBusy(false);
          }
        }}
      >
        <div className="settings-heading">
          <span className="step-icon">
            <LockKeyhole size={21} />
          </span>
          <div>
            <h2>Password</h2>
            <p>Choose a strong password you don’t use elsewhere.</p>
          </div>
        </div>
        {hasPassword ? (
          <>
            <label htmlFor="current-password">Current password</label>
            <input
              id="current-password"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              disabled={passwordBusy}
            />
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={10}
              maxLength={128}
              required
              disabled={passwordBusy}
              aria-describedby="password-guidance"
            />
            <p id="password-guidance" className="muted">
              Use at least 10 characters.
            </p>
            <label htmlFor="confirm-password">Confirm new password</label>
            <input
              id="confirm-password"
              name="confirmation"
              type="password"
              autoComplete="new-password"
              minLength={10}
              maxLength={128}
              required
              disabled={passwordBusy}
            />
            <button className="button" disabled={passwordBusy}>
              {passwordBusy ? "Updating…" : "Update password"}
            </button>
          </>
        ) : (
          <div className="notice">
            You sign in through Google and don’t have a JibonDrop password.
            Manage your Google password in your Google account.
          </div>
        )}
        <p role="status">{passwordMessage}</p>
      </form>
    </>
  );
}
