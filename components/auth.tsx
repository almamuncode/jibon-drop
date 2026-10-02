"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function AuthForm({ change = false }: { change?: boolean }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [dev, setDev] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  async function submit(verify: boolean) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/otp/" + (verify ? "verify" : "send"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          code,
          purpose: change ? "change" : "login",
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      if (verify) {
        router.push(data.redirect);
        router.refresh();
      } else {
        setSent(true);
        setDev(data.devCode || "");
        setCooldown(Date.now() + 60000);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(sent);
      }}
    >
      <label htmlFor={change ? "new-phone" : "phone"}>
        {change ? "New mobile number" : "Bangladesh mobile number"}
      </label>
      <input
        id={change ? "new-phone" : "phone"}
        type="tel"
        autoComplete="tel"
        placeholder="01XXXXXXXXX"
        required
        value={phone}
        readOnly={sent}
        onChange={(e) => setPhone(e.target.value)}
      />
      {sent && (
        <>
          <label htmlFor="code">6-digit verification code</label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <p className="muted">
            Code expires in 5 minutes. You have up to 5 attempts.
          </p>
        </>
      )}
      {dev && (
        <div className="notice">
          Development mock SMS — code: <strong>{dev}</strong>. No SMS was sent.
        </div>
      )}
      <button className="button full" disabled={busy}>
        {busy
          ? "Please wait…"
          : sent
            ? "Verify & continue"
            : "Send verification code"}
      </button>
      {sent && (
        <div className="actions">
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setSent(false);
              setDev("");
              setCode("");
            }}
          >
            Change number
          </button>
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={() => {
              if (Date.now() < cooldown)
                setError("Please wait 60 seconds before resending.");
              else submit(false);
            }}
          >
            Resend code
          </button>
        </div>
      )}
      <p role="alert" className="error">
        {error}
      </p>
    </form>
  );
}
