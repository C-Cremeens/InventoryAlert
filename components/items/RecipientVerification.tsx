"use client";
import { useEffect, useState } from "react";
type Recipient = { email: string; verified: boolean };
export default function RecipientVerification() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/recipients")
      .then(async (r) => {
        if (!r.ok) throw new Error();
        setRecipients(await r.json());
      })
      .catch(() => setMessage("Could not load recipient confirmations."));
  }, []);
  return (
    <section className="space-y-3 rounded-xl bg-surface-container-lowest p-5">
      <h2 className="font-semibold">Alert recipient confirmations</h2>
      <p className="text-sm">
        Alerts are sent only to confirmed addresses. Your verified account email
        is already confirmed.
      </p>
      {recipients.map((r) => (
        <div
          key={r.email}
          className="flex flex-wrap items-center justify-between gap-2 text-sm"
        >
          <span>
            {r.email} — {r.verified ? "Confirmed" : "Confirmation needed"}
          </span>
          {!r.verified && (
            <button
              disabled={busy !== null}
              className="rounded border px-3 py-1"
              onClick={async () => {
                setBusy(r.email);
                setMessage("");
                try {
                  const res = await fetch("/api/recipients", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: r.email }),
                  });
                  const data = await res.json();
                  setMessage(data.error ?? data.message);
                } catch {
                  setMessage("Unable to send confirmation. Please try again.");
                } finally {
                  setBusy(null);
                }
              }}
            >
              {busy === r.email ? "Sending…" : "Send confirmation"}
            </button>
          )}
        </div>
      ))}
      <p role="status" className="text-sm">
        {message}
      </p>
    </section>
  );
}
