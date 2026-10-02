"use client";
import { useState } from "react";
import { Phone, Copy } from "lucide-react";
export function Contact({ publicId }: { publicId: string }) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function reveal() {
    setBusy(true);
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setPhone(data.phone);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      {phone ? (
        <>
          <a className="button" href={"tel:" + phone}>
            <Phone size={16} />
            {phone}
          </a>
          <button
            className="button secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(phone);
                setMessage("Number copied.");
              } catch {
                setMessage(
                  "Copy is unavailable. Select the number to copy it.",
                );
              }
            }}
          >
            <Copy size={16} />
            Copy
          </button>
          <p className="muted">
            This number is self-reported and unverified. Contact respectfully.
            Explain your need and respect the donor’s decision.
          </p>
        </>
      ) : (
        <button className="button secondary" disabled={busy} onClick={reveal}>
          <Phone size={16} />
          {busy ? "Checking…" : "Contact donor"}
        </button>
      )}
      <p role="status" className="muted">
        {message}
      </p>
    </div>
  );
}
