"use client";
import { useTranslation } from "@/components/language";
import { useState } from "react";
import Link from "next/link";
import { Phone, Copy } from "lucide-react";
import { FacebookIcon } from "./facebook-icon";
import { ReportAbuse } from "./report-abuse";
type RequestStatus = { id?: string; status: string; expiresAt?: string | null };
export function Contact({ publicId }: { publicId: string }) {
  const t = useTranslation();
  const [phone, setPhone] = useState("");
  const [facebook, setFacebook] = useState("");
  const [request, setRequest] = useState<RequestStatus | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [login, setLogin] = useState(false);
  async function perform(intent?: "request" | "reveal", explanation?: string) {
    setBusy(true);
    setMessage("");
    setPhone("");
    setFacebook("");
    try {
      const response = await fetch(
        intent
          ? "/api/contact"
          : "/api/contact?publicId=" + encodeURIComponent(publicId),
        intent
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ publicId, intent, message: explanation }),
            }
          : { cache: "no-store" },
      );
      const result = await response.json();
      if (response.status === 401) {
        setLogin(true);
        return;
      }
      if (!response.ok) throw new Error(result.error);
      setRequest(result);
      if (result.phone) setPhone(result.phone);
      if (result.facebook) setFacebook(result.facebook);
      if (intent === "request" && result.status === "PENDING")
        setMessage(
          t("Request sent. The donor will review it in their dashboard."),
        );
    } catch (error) {
      setMessage(t.error((error as Error).message));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="donor-contact">
      {login ? (
        <Link className="button secondary" href="/login">
          {t("Log in to request contact")}
        </Link>
      ) : (
        <>
          {!request && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => perform()}
            >
              {busy ? t("Checking…") : t("Request donor contact")}
            </button>
          )}
          {request &&
            (request.status === "NONE" || request.status === "EXPIRED") && (
              <form
                className="contact-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const values = new FormData(event.currentTarget);
                  void perform("request", String(values.get("message")));
                }}
              >
                {request.status === "EXPIRED" && (
                  <p>
                    {t(
                      "Approval expired. Send a new request for the donor to review.",
                    )}
                  </p>
                )}
                <label>
                  {t("Why do you need to contact this donor?")}
                  <textarea
                    name="message"
                    required
                    minLength={10}
                    maxLength={500}
                    rows={3}
                    disabled={busy}
                  />
                </label>
                <p className="muted">
                  {t(
                    "Explain the blood group, hospital and timing. Do not include patient names or medical records.",
                  )}
                </p>
                <button className="button secondary" disabled={busy}>
                  {busy ? t("Sending…") : t("Send contact request")}
                </button>
              </form>
            )}
          {request?.status === "PUBLIC" && !phone && (
            <>
              <p>
                {t(
                  "This donor shares their number with signed-in users. Contact respectfully.",
                )}
              </p>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => perform("reveal")}
              >
                <Phone size={16} />
                {busy ? t("Checking…") : t("View phone number")}
              </button>
            </>
          )}
          {request?.status === "PENDING" && (
            <>
              <p>
                {t(
                  "Waiting for the donor’s approval. Their number stays private.",
                )}
              </p>
              <button
                className="text-button"
                disabled={busy}
                onClick={() => perform()}
              >
                {busy ? t("Checking…") : t("Check request status")}
              </button>
            </>
          )}
          {request?.status === "APPROVED" && !phone && (
            <>
              <p>
                {t(
                  "The donor approved your request. Access expires after 24 hours.",
                )}
              </p>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => perform("reveal")}
              >
                <Phone size={16} />
                {busy ? t("Checking…") : t("View phone number")}
              </button>
            </>
          )}
          {(request?.status === "DECLINED" ||
            request?.status === "REVOKED") && (
            <p>
              {t(
                "The donor declined or revoked this request. Please respect their decision.",
              )}
            </p>
          )}
          {phone && (
            <>
              <a className="button" href={"tel:" + phone}>
                <Phone size={16} />
                {phone}
              </a>
              {facebook && (
                <a
                  className="button secondary"
                  href={
                    facebook.startsWith("id:")
                      ? "https://www.facebook.com/profile.php?id=" +
                        facebook.slice(3)
                      : "https://www.facebook.com/" +
                        encodeURIComponent(facebook)
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FacebookIcon />
                  {t("Open Facebook profile")}
                </a>
              )}
              <button
                className="button secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(phone);
                    setMessage(t("Number copied."));
                  } catch {
                    setMessage(
                      t("Copy is unavailable. Select the number to copy it."),
                    );
                  }
                }}
              >
                <Copy size={16} />
                {t("Copy")}
              </button>
              <p className="muted">
                {t(
                  "This number is self-reported and unverified. Contact respectfully. Explain your need and respect the donor’s decision.",
                )}
              </p>
            </>
          )}
          {request?.status === "APPROVED" && (
            <button
              className="text-button"
              disabled={busy}
              onClick={() => perform()}
            >
              {busy ? t("Checking…") : t("Check request status")}
            </button>
          )}
          {request?.id && request.status !== "PUBLIC" && (
            <ReportAbuse
              contactRequestId={request.id}
              onReported={() => {
                setPhone("");
                setFacebook("");
                setRequest({ ...request, status: "REVOKED" });
              }}
            />
          )}
        </>
      )}
      <p role="status" className="muted">
        {message}
      </p>
    </div>
  );
}
