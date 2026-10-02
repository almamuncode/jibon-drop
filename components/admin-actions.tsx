"use client";
import { useTranslation } from "@/components/language";

import { useState } from "react";
import { useRouter } from "next/navigation";
export function AdminActions({
  userId,
  actions,
  donationId,
}: {
  userId: string;
  actions: { value: string; label: string }[];
  donationId?: string;
}) {
  const t = useTranslation();

  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <form
      className="admin-actions"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        setBusy(true);
        setMessage("");
        try {
          const response = await fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              donationId,
              action: data.get("action"),
              reason: data.get("reason"),
            }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          form.reset();
          setMessage(t("Change saved."));
          router.refresh();
        } catch (error) {
          setMessage((error as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        {t("Action")}{" "}
        <select name="action" required>
          {actions.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("Reason")}{" "}
        <input
          name="reason"
          required
          minLength={3}
          maxLength={500}
          placeholder={t("Explain this change for the activity log")}
        />
      </label>
      <button className="button secondary" disabled={busy}>
        {busy ? t("Saving…") : t("Apply change")}
      </button>
      <p role="status">{t.error(message)}</p>
    </form>
  );
}
