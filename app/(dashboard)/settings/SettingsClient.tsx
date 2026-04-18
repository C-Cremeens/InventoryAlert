"use client";

import { useState } from "react";
import type { Tier } from "@prisma/client";

interface Props {
  currentTier: Tier;
  hasCustomer: boolean;
  stripePrices: { FAMILY: string; ENTERPRISE: string };
}

export default function SettingsClient({ currentTier, hasCustomer, stripePrices }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleUpgrade(tier: "FAMILY" | "ENTERPRISE") {
    setError("");
    setLoading(tier);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });
    const data = await res.json();
    setLoading(null);
    if (res.ok && data.url) {
      window.location.href = data.url;
    } else {
      setError(data.error || "Could not start checkout. Please try again.");
    }
  }

  async function handlePortal() {
    setError("");
    setLoading("portal");
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    setLoading(null);
    if (res.ok && data.url) {
      window.location.href = data.url;
    } else {
      setError(data.error || "Could not open billing portal.");
    }
  }

  return (
    <div className="space-y-3 pt-2">
      {error && (
        <p className="text-sm text-error">{error}</p>
      )}

      {currentTier === "FREE" && (
        <div className="space-y-2">
          <p className="text-sm text-on-surface-variant font-medium">Upgrade your plan</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => handleUpgrade("FAMILY")}
              disabled={!!loading}
              className="flex-1 bg-primary text-on-primary rounded-full border-0 px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading === "FAMILY" ? "Loading…" : `Family — ${stripePrices.FAMILY}`}
            </button>
            <button
              onClick={() => handleUpgrade("ENTERPRISE")}
              disabled={!!loading}
              className="flex-1 bg-primary-container text-on-primary-container rounded-full border border-primary/20 px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading === "ENTERPRISE" ? "Loading…" : `Enterprise — ${stripePrices.ENTERPRISE}`}
            </button>
          </div>
        </div>
      )}

      {currentTier === "FAMILY" && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => handleUpgrade("ENTERPRISE")}
            disabled={!!loading}
            className="flex-1 bg-primary-container text-on-primary-container rounded-full border border-primary/20 px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading === "ENTERPRISE" ? "Loading…" : `Upgrade to Enterprise — ${stripePrices.ENTERPRISE}`}
          </button>
          {hasCustomer && (
            <button
              onClick={handlePortal}
              disabled={!!loading}
              className="sm:w-auto border border-outline text-on-surface-variant rounded-full px-4 py-2 text-sm hover:bg-surface-container disabled:opacity-50 transition-colors"
            >
              {loading === "portal" ? "Loading…" : "Edit / Cancel"}
            </button>
          )}
        </div>
      )}

      {currentTier === "ENTERPRISE" && hasCustomer && (
        <button
          onClick={handlePortal}
          disabled={!!loading}
          className="border border-outline text-on-surface-variant rounded-full px-4 py-2 text-sm hover:bg-surface-container disabled:opacity-50 transition-colors"
        >
          {loading === "portal" ? "Loading…" : "Edit / Cancel"}
        </button>
      )}
    </div>
  );
}
