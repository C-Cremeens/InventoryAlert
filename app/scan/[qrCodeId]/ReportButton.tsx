"use client";
import { useRef, useState } from "react";
export default function ReportButton({ qrCodeId }: { qrCodeId: string }) {
  const key = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [acknowledgement, setAcknowledgement] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  async function report() {
    if (busy || done) return;
    setBusy(true);
    setMessage("");
    // Reuse the same key after a network failure; explicit fresh page visits get a new key.
    key.current ??= crypto.randomUUID();
    try {
      const res = await fetch(`/api/scan/${qrCodeId}`, {
        method: "POST",
        headers: { "Idempotency-Key": key.current },
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data.error ?? "Unable to record your report. Please try again.",
        );
      setDone(true);
      setMessage(data.message);
      setAcknowledgement(data.acknowledgement ?? null);
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Unable to connect. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        onClick={report}
        disabled={busy || done}
        className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Recording…" : done ? "Report recorded" : "Report low stock"}
      </button>
      <p role="status" className="text-sm">
        {message}
      </p>
      {acknowledgement && <p className="text-sm">{acknowledgement}</p>}
    </>
  );
}
