"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
function Confirm() {
  const params = useSearchParams();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <main className="mx-auto max-w-md space-y-4 p-8">
      <h1 className="text-2xl font-bold">Confirm inventory alerts</h1>
      <p>
        Confirm only if you want to receive low-stock notifications from the
        account identified in your email.
      </p>
      <button
        disabled={busy || done}
        className="rounded bg-blue-700 px-4 py-2 text-white"
        onClick={async () => {
          setBusy(true);
          try {
            const res = await fetch("/api/recipients/confirm", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token: params.get("token"),
                consent: true,
              }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setDone(true);
            setMessage("Confirmed. You can close this page.");
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Please try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Confirming…" : "Yes, send me inventory alerts"}
      </button>
      <p role="status">{message}</p>
    </main>
  );
}
export default function Page() {
  return (
    <Suspense>
      <Confirm />
    </Suspense>
  );
}
