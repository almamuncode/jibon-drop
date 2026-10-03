"use client";
import { useTranslation } from "@/components/language";

import { useState } from "react";
import { useRouter } from "next/navigation";
export async function api(path: string, body: unknown, method = "POST") {
  const r = await fetch("/api/" + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error);
  return data;
}
export function AccountActions({
  showLogout = true,
}: {
  showLogout?: boolean;
}) {
  const t = useTranslation();

  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(path: string) {
    setBusy(true);
    setError("");
    try {
      await api(
        path,
        path === "account" ? { confirm } : {},
        path === "account" ? "DELETE" : "POST",
      );
      // Reload to discard any cached authenticated pages after deletion.
      if (path === "account") window.location.replace("/");
      else {
        router.push("/");
        router.refresh();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="account-actions">
      {showLogout && (
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => run("logout")}
        >
          {t("Log out")}{" "}
        </button>
      )}
      <button
        className="text-button"
        type="button"
        disabled={busy}
        aria-expanded={deleting}
        onClick={() => {
          setDeleting(!deleting);
          setConfirm("");
          setError("");
        }}
      >
        {deleting ? t("Cancel deletion") : t("Delete my profile")}
      </button>
      {deleting && (
        <div className="notice delete-profile-confirmation">
          <p>
            {t(
              "This permanently deletes your sign-in account, donor profile, donation history and photo, and logs out all devices. This cannot be undone. Type DELETE to confirm.",
            )}{" "}
          </p>
          <input
            aria-label={t("Deletion confirmation")}
            autoComplete="off"
            disabled={busy}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <button
            className="button"
            disabled={confirm !== "DELETE" || busy}
            onClick={() => run("account")}
          >
            {busy ? t("Deleting…") : t("Permanently delete my profile")}
          </button>
        </div>
      )}
      <p className="error" role="alert">
        {t.error(error)}
      </p>
    </div>
  );
}

export function StatusControls({
  available,
  visible,
}: {
  available: boolean;
  visible: boolean;
}) {
  const t = useTranslation();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [current, setCurrent] = useState(available);
  return (
    <div className="availability-control">
      <div className="availability-row">
        <div>
          <strong>{t("Available to donate now")}</strong>
          <p className="muted">
            {current ? t("Willing to donate") : t("Temporarily unavailable")}
          </p>
        </div>
        <button
          type="button"
          className="availability-switch"
          role="switch"
          aria-checked={current}
          aria-label={t("Available to donate now")}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setMessage("");
            try {
              await api("status", { available: !current, visible }, "PATCH");
              setCurrent(!current);
              setMessage(t("Status updated."));
              router.refresh();
            } catch (error) {
              setMessage((error as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <span />
        </button>
      </div>
      <p className="muted availability-note">
        {t(
          "Availability is your willingness to donate, not medical clearance.",
        )}
      </p>
      {message && (
        <p role="status" className="muted">
          {t.error(message)}
        </p>
      )}
    </div>
  );
}
