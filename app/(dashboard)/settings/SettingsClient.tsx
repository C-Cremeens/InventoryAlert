"use client";

import { useState } from "react";
import type { Tier } from "@prisma/client";

interface Props {
  currentTier: Tier;
  hasSubscription: boolean;
}

export default function SettingsClient({ currentTier, hasSubscription }: Props) {
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
        <p className="text-sm text-red-600">{error}</p>
      )}

      {currentTier === "FREE" && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 font-medium">Upgrade your plan</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => handleUpgrade("FAMILY")}
              disabled={!!loading}
              className="flex-1 border border-blue-200 bg-blue-50 text-blue-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-100 disabled:opacity-50 transition-colors"
            >
              {loading === "FAMILY" ? "Loading…" : "Family — $9/mo"}
            </button>
            <button
              onClick={() => handleUpgrade("ENTERPRISE")}
              disabled={!!loading}
              className="flex-1 border border-purple-200 bg-purple-50 text-purple-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-purple-100 disabled:opacity-50 transition-colors"
            >
              {loading === "ENTERPRISE" ? "Loading…" : "Enterprise — $29/mo"}
            </button>
          </div>
        </div>
      )}

      {currentTier === "FAMILY" && (
        <div className="flex gap-2">
          <button
            onClick={() => handleUpgrade("ENTERPRISE")}
            disabled={!!loading}
            className="w-full sm:flex-1 border border-purple-200 bg-purple-50 text-purple-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-purple-100 disabled:opacity-50 transition-colors"
          >
            {loading === "ENTERPRISE" ? "Loading…" : "Upgrade to Enterprise — $29/mo"}
          </button>
          {hasSubscription && (
            <button
              onClick={handlePortal}
              disabled={!!loading}
              className="w-full sm:w-auto border border-gray-300 text-gray-600 rounded-lg px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {loading === "portal" ? "Loading…" : "Manage billing"}
            </button>
          )}
        </div>
      )}

      {currentTier === "ENTERPRISE" && hasSubscription && (
        <button
          onClick={handlePortal}
          disabled={!!loading}
          className="border border-gray-300 text-gray-600 rounded-lg px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {loading === "portal" ? "Loading…" : "Manage billing / Cancel"}
        </button>
      )}
    </div>
  );
}
