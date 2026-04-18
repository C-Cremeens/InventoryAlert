"use client";

import { useState } from "react";
import type { Tier } from "@prisma/client";

interface Props {
  currentTier: Tier;
  hasCustomer: boolean;
  stripePrices: { PRO: string };
  hasPushSubscription: boolean;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export default function SettingsClient({
  currentTier,
  hasCustomer,
  stripePrices,
  hasPushSubscription,
}: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pushEnabled, setPushEnabled] = useState(hasPushSubscription);

  async function handleUpgrade(tier: "PRO") {
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

  async function handleEnablePush() {
    setError("");
    setLoading("push-enable");

    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("Your browser does not support push notifications.");
      }

      const keyRes = await fetch("/api/push/public-key", { cache: "no-store" });
      const keyData = await keyRes.json();
      if (!keyRes.ok || !keyData?.enabled || !keyData?.publicKey) {
        throw new Error("Push notifications are not configured on the server.");
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Permission denied. Please allow notifications in your browser settings.");
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();

      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
        }));

      const saveRes = await fetch("/api/push/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });

      if (!saveRes.ok) {
        throw new Error("Failed to save your notification subscription.");
      }

      setPushEnabled(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to enable notifications.";
      setError(message);
    } finally {
      setLoading(null);
    }
  }

  async function handleDisablePush() {
    setError("");
    setLoading("push-disable");

    try {
      if (!("serviceWorker" in navigator)) {
        throw new Error("Service workers are not supported in this browser.");
      }

      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        await fetch("/api/push/subscription", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }

      setPushEnabled(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to disable notifications.";
      setError(message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6 pt-2">
      {error && (
        <p className="text-sm text-error">{error}</p>
      )}

      <div className="rounded-xl border border-outline-variant p-4 space-y-3">
        <h3 className="font-medium text-on-surface">Phone Notifications</h3>
        <p className="text-sm text-on-surface-variant">
          Enable push notifications to get alerts on your installed app when a new stocking request is created.
        </p>
        {pushEnabled ? (
          <button
            onClick={handleDisablePush}
            disabled={!!loading}
            className="border border-outline text-on-surface-variant rounded-full px-4 py-2 text-sm hover:bg-surface-container disabled:opacity-50 transition-colors"
          >
            {loading === "push-disable" ? "Disabling…" : "Disable notifications"}
          </button>
        ) : (
          <button
            onClick={handleEnablePush}
            disabled={!!loading}
            className="bg-primary text-on-primary rounded-full border-0 px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading === "push-enable" ? "Enabling…" : "Enable notifications"}
          </button>
        )}
      </div>

      {currentTier === "FREE" && (
        <div className="space-y-2">
          <p className="text-sm text-on-surface-variant font-medium">Upgrade your plan</p>
          <button
            onClick={() => handleUpgrade("PRO")}
            disabled={!!loading}
            className="w-full bg-primary text-on-primary rounded-full border-0 px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading === "PRO" ? "Loading…" : `Upgrade to Pro — ${stripePrices.PRO}`}
          </button>
        </div>
      )}

      {currentTier === "PRO" && hasCustomer && (
        <button
          onClick={handlePortal}
          disabled={!!loading}
          className="border border-outline text-on-surface-variant rounded-full px-4 py-2 text-sm hover:bg-surface-container disabled:opacity-50 transition-colors"
        >
          {loading === "portal" ? "Loading…" : "Manage subscription"}
        </button>
      )}
    </div>
  );
}
