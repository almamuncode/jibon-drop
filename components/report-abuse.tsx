"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "./language";
import { api } from "./dashboard";
export function ReportAbuse({
  contactRequestId,
  onReported,
}: {
  contactRequestId: string;
  onReported?: () => void;
}) {
  const t = useTranslation();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <div className="report-abuse">
      <button
        className="text-button"
        type="button"
        disabled={busy}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? t("Cancel report") : t("Report abuse")}
      </button>
      {open && (
        <form
          className="contact-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setBusy(true);
            setMessage("");
            try {
              await api("reports", {
                contactRequestId,
                reason: data.get("reason"),
                details: data.get("details"),
              });
              setOpen(false);
              setMessage(
                t(
                  "Report sent to administrators. Contact access has been revoked.",
                ),
              );
              onReported?.();
              router.refresh();
            } catch (error) {
              setMessage(t.error((error as Error).message));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            {t("Reason")}
            <select name="reason" required disabled={busy}>
              <option value="UNWANTED_CONTACT">{t("Unwanted contact")}</option>
              <option value="SPAM">{t("Spam")}</option>
              <option value="INAPPROPRIATE_BEHAVIOR">
                {t("Inappropriate behavior")}
              </option>
            </select>
          </label>
          <label>
            {t("Describe what happened")}
            <textarea
              name="details"
              required
              minLength={10}
              maxLength={1000}
              rows={3}
              disabled={busy}
            />
          </label>
          <p className="muted">
            {t(
              "Do not include phone numbers, patient identities or medical records. Administrators can review this report.",
            )}
          </p>
          <button className="button secondary" disabled={busy}>
            {busy ? t("Sending…") : t("Send report")}
          </button>
        </form>
      )}
      <p role="status">{message}</p>
    </div>
  );
}
