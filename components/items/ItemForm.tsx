"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InventoryItem, Tier } from "@prisma/client";

interface Props {
  item?: InventoryItem;
  mode: "create" | "edit";
  currentTier: Tier;
}

export default function ItemForm({ item, mode, currentTier }: Props) {
  const router = useRouter();
  const isPro = currentTier === "PRO";
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [alertEmail, setAlertEmail] = useState(item?.alertEmail ?? "");
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? "");
  const [lowStockThreshold, setLowStockThreshold] = useState(
    item?.lowStockThreshold != null ? String(item.lowStockThreshold) : ""
  );
  const [alertEmailEnabled, setAlertEmailEnabled] = useState(
    item?.alertEmailEnabled ?? true
  );
  const [scanCooldownMinutes, setScanCooldownMinutes] = useState(
    item?.scanCooldownMinutes != null ? String(item.scanCooldownMinutes) : "60"
  );
  const [scanAcknowledgement, setScanAcknowledgement] = useState(
    item?.scanAcknowledgement ?? ""
  );
  const [externalCartLink, setExternalCartLink] = useState(item?.externalCartLink ?? "");
  const [externalPlatform, setExternalPlatform] = useState<string>(item?.externalPlatform ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2 MB.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      setUploading(false);
      if (res.ok) {
        setImageUrl(data.url);
      } else {
        setError(data.error || "Upload failed.");
      }
    } catch {
      setUploading(false);
      setError("Upload failed. Please try again.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const threshold = lowStockThreshold ? parseInt(lowStockThreshold, 10) : null;
      const cooldown = scanCooldownMinutes ? parseInt(scanCooldownMinutes, 10) : 60;
      const payload = {
        name,
        description: description || undefined,
        alertEmail,
        imageUrl: imageUrl || undefined,
        lowStockThreshold: threshold && !isNaN(threshold) ? threshold : null,
        alertEmailEnabled,
        scanCooldownMinutes: !isNaN(cooldown) ? cooldown : 60,
        scanAcknowledgement: scanAcknowledgement.trim() || undefined,
        externalCartLink: externalCartLink || undefined,
        externalPlatform: externalPlatform || null,
      };

      const res = await fetch(
        mode === "create" ? "/api/items" : `/api/items/${item!.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        router.push("/items");
        router.refresh();
      }
    } catch {
      setLoading(false);
      setError("An unexpected error occurred. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      {error && (
        <div className="bg-error-container border border-error/20 text-on-error-container text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-on-surface-variant mb-1">
          Item name <span className="text-error">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
          className="w-full border border-outline rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-surface-container-lowest text-on-surface"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-on-surface-variant mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={500}
          className="w-full border border-outline rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-surface-container-lowest text-on-surface resize-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-on-surface-variant mb-1">
          Low stock threshold
        </label>
        <input
          type="number"
          value={lowStockThreshold}
          onChange={(e) => setLowStockThreshold(e.target.value)}
          min={1}
          max={9999}
          placeholder="e.g. 5"
          className="w-full border border-outline rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-surface-container-lowest text-on-surface"
        />
        <p className="text-xs text-outline mt-1">
          Optional. Print this number on the label as a restock reminder.
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-on-surface-variant mb-1">
          Alert email <span className="text-error">*</span>
        </label>
        <input
          type="email"
          value={alertEmail}
          onChange={(e) => setAlertEmail(e.target.value)}
          required
          className="w-full border border-outline rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-surface-container-lowest text-on-surface"
          placeholder="alerts@yourcompany.com"
        />
        <p className="text-xs text-outline mt-1">
          This address receives low stock alerts when the QR code is scanned.
        </p>
      </div>
      <div className="flex items-center justify-between py-1">
        <div>
          <p className="text-sm font-medium text-on-surface">Alert emails</p>
          <p className="text-xs text-outline mt-0.5">
            Send an email when this item&apos;s QR code is scanned
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={alertEmailEnabled}
          onClick={() => setAlertEmailEnabled((v) => !v)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
            alertEmailEnabled ? "bg-secondary" : "bg-outline-variant"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              alertEmailEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
      <div className="space-y-4 rounded-xl border border-outline-variant p-4 bg-surface-container-low">
        <div>
          <p className="text-sm font-medium text-on-surface">Pro scan controls</p>
          <p className="text-xs text-outline mt-0.5">
            Configure per-item scan timeout and acknowledgement message.
          </p>
          {!isPro && (
            <p className="text-xs text-secondary mt-1">
              Upgrade to Pro to customize these settings.
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-on-surface-variant mb-1">
            Scan timeout (minutes)
          </label>
          <input
            type="number"
            value={scanCooldownMinutes}
            onChange={(e) => setScanCooldownMinutes(e.target.value)}
            min={1}
            max={1440}
            disabled={!isPro}
            className="w-full border border-outline rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-surface-container-lowest text-on-surface disabled:opacity-60"
          />
          <p className="text-xs text-outline mt-1">
            How long to wait before another email alert can be sent for this item.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-on-surface-variant mb-1">
            QR acknowledgement message
          </label>
          <textarea
            value={scanAcknowledgement}
            onChange={(e) => setScanAcknowledgement(e.target.value)}
            rows={3}
            maxLength={280}
            disabled={!isPro}
            placeholder="Thanks! We received your scan and notified the team."
            className="w-full border border-outline rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-surface-container-lowest text-on-surface resize-none disabled:opacity-60"
          />
          <p className="text-xs text-outline mt-1">
            Optional. This replaces the default message shown after scanning.
          </p>
        </div>
      </div>
      <div className="border-t border-outline-variant pt-5">
        <p className="text-sm font-medium text-on-surface mb-1">Reorder link (optional)</p>
        <p className="text-xs text-outline mb-3">
          When your QR code is scanned, a &ldquo;Reorder now&rdquo; button will appear on the confirmation page.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Cart / reorder URL
            </label>
            <input
              type="url"
              value={externalCartLink}
              onChange={(e) => setExternalCartLink(e.target.value)}
              placeholder="https://www.amazon.com/dp/..."
              className="w-full border border-outline rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-surface-container-lowest text-on-surface"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Platform
            </label>
            <select
              value={externalPlatform}
              onChange={(e) => setExternalPlatform(e.target.value)}
              className="w-full border border-outline rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-surface-container-lowest text-on-surface"
            >
              <option value="">- select -</option>
              <option value="AMAZON">Amazon</option>
              <option value="WALMART">Walmart</option>
              <option value="SHOPIFY">Shopify</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-on-surface-variant mb-1">
          Image (optional)
        </label>
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Item"
            className="w-24 h-24 object-cover rounded-lg mb-2 border border-outline-variant"
          />
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageChange}
          disabled={uploading}
          className="block text-sm text-on-surface-variant file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-surface-container file:text-on-surface-variant hover:file:bg-surface-container-high"
        />
        {uploading && (
          <p className="text-xs text-secondary mt-1">Uploading...</p>
        )}
      </div>
      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
        <button
          type="submit"
          disabled={loading || uploading}
          className="w-full sm:w-auto bg-primary text-on-primary rounded-full px-5 py-2 text-sm font-medium hover:bg-primary-container disabled:opacity-50 transition-colors"
        >
          {loading
            ? mode === "create"
              ? "Creating..."
              : "Saving..."
            : mode === "create"
            ? "Create item"
            : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="w-full sm:w-auto border border-outline text-on-surface rounded-full px-5 py-2 text-sm hover:bg-surface-container-low transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
