"use client";

import { useState } from "react";
import PrintLabel from "@/components/print/PrintLabel";
import { LABEL_SIZES, LABEL_SIZE_CONFIG } from "@/lib/label";
import type { LabelSize } from "@/lib/label";

interface Props {
  itemId: string;
  itemName: string;
  qrCodeId: string;
  description?: string | null;
  lowStockThreshold?: number | null;
  canCustomizeLabels: boolean;
}

export default function PrintPageClient({
  itemId,
  itemName,
  qrCodeId,
  description,
  lowStockThreshold,
  canCustomizeLabels,
}: Props) {
  const [size, setSize] = useState<LabelSize>("3x1");
  const [showDescription, setShowDescription] = useState(false);
  const [showLowStock, setShowLowStock] = useState(false);

  const labelProps = {
    itemName,
    qrCodeId,
    size,
    description,
    lowStockThreshold,
    showDescription: canCustomizeLabels && showDescription,
    showLowStock: canCustomizeLabels && showLowStock,
  };

  const hasContentOptions = description || lowStockThreshold;

  return (
    <>
      {/* Screen view */}
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-6 print:hidden">
        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 w-full max-w-sm">
          {/* Size selector */}
          <p className="text-sm font-medium text-gray-700 mb-2">Label size</p>
          <div className="flex gap-2">
            {LABEL_SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`flex-1 py-1.5 px-2 rounded text-xs font-medium border transition-colors ${
                  size === s
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {LABEL_SIZE_CONFIG[s].label}
              </button>
            ))}
          </div>

          {/* Content toggles — paid plans only */}
          {canCustomizeLabels ? (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Label content</p>
              {hasContentOptions ? (
                <div className="space-y-2">
                  {description && (
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showDescription}
                        onChange={(e) => setShowDescription(e.target.checked)}
                        className="rounded"
                      />
                      Show description
                    </label>
                  )}
                  {lowStockThreshold && (
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showLowStock}
                        onChange={(e) => setShowLowStock(e.target.checked)}
                        className="rounded"
                      />
                      Show low stock reminder (below {lowStockThreshold})
                    </label>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  Add a description or low stock threshold to this item to show them on the label.
                </p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-xs text-gray-400">
              Upgrade to a paid plan to add description and low stock reminders to labels.
            </p>
          )}
        </div>

        {/* Preview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-xs text-gray-500 mb-3 text-center">Preview</p>
          <PrintLabel {...labelProps} />
        </div>

        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Print label
        </button>
        <a
          href={`/items/${itemId}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to item
        </a>
      </div>

      {/* Print-only view */}
      <div className="hidden print:block">
        <PrintLabel {...labelProps} />
      </div>
    </>
  );
}
