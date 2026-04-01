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
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
          {item.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
              {item.description}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">{item.alertEmail}</p>
        </div>
        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-12 h-12 object-cover rounded-lg border border-gray-100 flex-shrink-0"
          />
        )}
      </div>

      <div className="flex justify-center">
        <QRCodeDisplay qrCodeId={item.qrCodeId} size={140} />
      </div>

      <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-3">
        <Link
          href={`/items/${item.id}`}
          className="text-center border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-xs font-medium hover:bg-gray-50 transition-colors"
        >
          Edit
        </Link>
        <Link
          href={`/items/${item.id}/print`}
          target="_blank"
          className="text-center border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-xs font-medium hover:bg-gray-50 transition-colors"
        >
          Print label
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="border border-red-200 text-red-600 rounded-lg px-3 py-2 text-xs font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          {deleting ? "…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
