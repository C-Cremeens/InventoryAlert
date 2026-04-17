"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InventoryItem } from "@prisma/client";
import QRCodeDisplay from "./QRCodeDisplay";

export default function ItemCard({ item }: { item: InventoryItem }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/items/${item.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl p-5 flex flex-col gap-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-on-surface truncate">{item.name}</h3>
          {item.description && (
            <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">
              {item.description}
            </p>
          )}
          <p className="text-xs text-outline mt-1">{item.alertEmail}</p>
          {item.alertEmailEnabled === false && (
            <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] font-medium">
              <span className="material-symbols-outlined text-[12px] leading-none">notifications_off</span>
              Alerts off
            </span>
          )}
        </div>
        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-12 h-12 object-cover rounded-lg border border-outline-variant flex-shrink-0"
          />
        )}
      </div>

      <div className="flex justify-center">
        <QRCodeDisplay qrCodeId={item.qrCodeId} size={140} />
      </div>

      <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-3">
        <Link
          href={`/items/${item.id}`}
          className="text-center border border-outline text-on-surface rounded-full px-3 py-2 text-xs font-medium hover:bg-surface-container-low transition-colors"
        >
          Edit
        </Link>
        <Link
          href={`/items/${item.id}/print`}
          target="_blank"
          className="text-center border border-outline text-on-surface rounded-full px-3 py-2 text-xs font-medium hover:bg-surface-container-low transition-colors"
        >
          Print label
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="border border-error/30 text-error rounded-full px-3 py-2 text-xs font-medium hover:bg-error-container disabled:opacity-50 transition-colors"
        >
          {deleting ? "…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
