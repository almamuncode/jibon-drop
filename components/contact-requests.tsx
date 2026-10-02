"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "./language";
import { api } from "./dashboard";
export function ContactDecision({
  id,
  status,
  sharingEnabled,
}: {
  id: string;
  status: string;
  sharingEnabled: boolean;
}) {
  const t = useTranslation();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function decide(action: string) {
    setBusy(true);
    setMessage("");
    try {
      await api("contact-requests", { id, action });
      setMessage(t("Change saved."));
      router.refresh();
    } catch (error) {
      setMessage(t.error((error as Error).message));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <div className="contact-buttons">
        {status === "PENDING" && (
          <>
            <button
              className="button"
              disabled={busy || !sharingEnabled}
              onClick={() => decide("approve")}
            >
              {t("Approve for 24 hours")}
            </button>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => decide("decline")}
            >
              {t("Decline request")}
            </button>
          </>
        )}
        {status === "APPROVED" && (
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => decide("revoke")}
          >
            {t("Revoke access")}
          </button>
        )}
      </div>
      {status === "PENDING" && !sharingEnabled && (
        <p className="muted">
          {t(
            "Enable phone sharing on your published profile before approving.",
          )}
        </p>
      )}
      <p role="status">{message}</p>
    </div>
  );
}
export function ResolveReport({ id }: { id: string }) {
  const t = useTranslation();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <form
      className="contact-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setBusy(true);
        setMessage("");
        try {
          await api("admin/reports", { id, reason: data.get("reason") });
          router.refresh();
        } catch (error) {
          setMessage(t.error((error as Error).message));
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        {t("Review note")}
        <input
          name="reason"
          required
          minLength={3}
          maxLength={500}
          disabled={busy}
        />
      </label>
      <button className="button secondary" disabled={busy}>
        {busy ? t("Saving…") : t("Mark reviewed")}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
