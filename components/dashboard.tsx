"use client";
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
          Log out
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
        {deleting ? "Cancel deletion" : "Delete my profile"}
      </button>
      {deleting && (
        <div className="notice">
          <p>
            This permanently deletes your sign-in account, donor profile,
            donation history and photo, and logs out all devices. This cannot be
            undone. Type DELETE to confirm.
          </p>
          <input
            aria-label="Deletion confirmation"
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
            {busy ? "Deleting…" : "Permanently delete my profile"}
          </button>
        </div>
      )}
      <p className="error" role="alert">
        {error}
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
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function update(next: { available: boolean; visible: boolean }) {
    setBusy(true);
    try {
      await api("status", next, "PATCH");
      router.refresh();
      setMessage("Status updated.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <label className="check">
        <input
          type="checkbox"
          checked={available}
          disabled={busy}
          onChange={(e) => update({ available: e.target.checked, visible })}
        />
        Available to help
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={visible}
          disabled={busy}
          onChange={(e) => update({ available, visible: e.target.checked })}
        />
        Show my directory listing
      </label>
      <p role="status" className="muted">
        {message}
      </p>
    </div>
  );
}
