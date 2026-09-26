"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function OnboardingPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="mx-auto max-w-md space-y-4 p-8">
      <h1 className="text-2xl font-bold">Welcome to InventoryAlert</h1>
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          try {
            const res = await fetch("/api/auth/onboarding", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ termsAccepted: true }),
            });
            if (!res.ok)
              throw new Error(
                "Please sign in and verify your email before continuing.",
              );
            router.push("/dashboard");
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Please try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block">
          <input type="checkbox" required className="mr-2" />I agree to the{" "}
          <Link href="/terms" className="underline">
            Terms of Service
          </Link>{" "}
          and have read the{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </label>
        <button
          disabled={busy}
          className="rounded bg-blue-700 px-4 py-2 text-white"
        >
          {busy ? "Saving…" : "Continue"}
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
    </main>
  );
}
