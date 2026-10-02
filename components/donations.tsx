"use client";
import { dateLabel } from "@/lib/format";
import { useLocale, useTranslation } from "@/components/language";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./dashboard";

type Record = {
  id: string;
  date: string;
  hospital: string | null;
  note: string | null;
  submissionId: string;
};
export function Donations({
  records,
  today,
}: {
  records: Record[];
  today: string;
}) {
  const t = useTranslation();
  const locale = useLocale();

  const router = useRouter();
  const [editing, setEditing] = useState<Record | null>(null);
  const [deleting, setDeleting] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [submissionId, setSubmissionId] = useState(() => crypto.randomUUID());
  return (
    <>
      <form
        key={editing?.id || submissionId}
        className="dashboard-panel"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const f = new FormData(e.currentTarget);
          try {
            await api("donations", {
              id: editing?.id,
              date: f.get("date"),
              hospital: f.get("hospital"),
              note: f.get("note"),
              submissionId: editing?.submissionId || submissionId,
            });
            setEditing(null);
            setSubmissionId(crypto.randomUUID());
            setMessage(t("Donation record saved."));
            router.refresh();
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>{editing ? t("Edit donation") : t("Record a donation")}</h2>
        <label htmlFor="date">{t("Donation date")}</label>
        <input
          id="date"
          name="date"
          type="date"
          required
          max={today}
          defaultValue={editing?.date}
        />
        <label htmlFor="hospital">
          {t("Hospital / location (optional, private)")}{" "}
        </label>
        <input
          id="hospital"
          name="hospital"
          maxLength={120}
          defaultValue={editing?.hospital || ""}
        />
        <label htmlFor="note">{t("Personal note (optional, private)")}</label>
        <textarea
          id="note"
          name="note"
          maxLength={500}
          defaultValue={editing?.note || ""}
        />
        <p className="muted">
          {t(
            "Do not include patient identity or medical records. You can record past donations.",
          )}{" "}
        </p>
        <div className="actions">
          <button className="button" disabled={busy}>
            {busy ? t("Saving…") : t("Save donation")}
          </button>
          {editing && (
            <button
              type="button"
              className="text-button"
              onClick={() => setEditing(null)}
            >
              {t("Cancel edit")}{" "}
            </button>
          )}
        </div>
      </form>
      <p role="status">{t.error(message)}</p>
      <h2>{t("Your private records")}</h2>
      {!records.length ? (
        <div className="empty">
          <h3>{t("No donations recorded yet.")}</h3>
          <p>
            {t(
              "Add a past or recent donation. Missing records don’t mean you have never donated.",
            )}{" "}
          </p>
        </div>
      ) : (
        records.map((r) => (
          <article className="record" key={r.id}>
            <div>
              <h3>{dateLabel(r.date, locale)}</h3>
              <p>{r.hospital || t("No location recorded")}</p>
              {r.note && <p className="muted">{r.note}</p>}
            </div>
            <div className="actions">
              <button
                className="button secondary"
                onClick={() => setEditing(r)}
              >
                {t("Edit")}{" "}
              </button>
              <button className="text-button" onClick={() => setDeleting(r.id)}>
                {t("Delete")}{" "}
              </button>
            </div>
            {deleting === r.id && (
              <div className="notice">
                <p>
                  {t(
                    "Delete this donation record? Your public count and last date will update.",
                  )}{" "}
                </p>
                <button
                  className="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await api("donations", { id: r.id }, "DELETE");
                      setDeleting("");
                      setMessage(t("Record deleted."));
                      router.refresh();
                    } catch (e) {
                      setMessage((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {t("Confirm deletion")}{" "}
                </button>
                <button className="text-button" onClick={() => setDeleting("")}>
                  {t("Cancel")}{" "}
                </button>
              </div>
            )}
          </article>
        ))
      )}
    </>
  );
}
