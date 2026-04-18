"use client";

import { useState } from "react";
import PrintLabel from "@/components/print/PrintLabel";
import LabelEditor from "@/components/print/LabelEditor";
import { LABEL_SIZES, LABEL_SIZE_CONFIG, getDefaultTextElements } from "@/lib/label";
import type { LabelSize, TextElement } from "@/lib/label";

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

  const [elements, setElements] = useState<TextElement[]>(() =>
    getDefaultTextElements({ itemName, description, lowStockThreshold, size })
  );

  const handleSizeChange = (newSize: LabelSize) => {
    setSize(newSize);
    setElements(getDefaultTextElements({ itemName, description, lowStockThreshold, size: newSize }));
  };

  return (
    <>
      {/* Screen view */}
      <div className="print:hidden max-w-sm">
        <h1 className="text-2xl font-bold text-on-surface font-headline mb-6">Print Label</h1>

        {/* Size selector */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-5 mb-4 shadow-sm">
          <p className="text-sm font-medium text-on-surface mb-3">Label size</p>
          <div className="flex gap-2">
            {LABEL_SIZES.map((s) => (
              <button
                key={s}
                onClick={() => handleSizeChange(s)}
                className={`flex-1 py-2 px-2 rounded-full text-xs font-medium border transition-colors ${
                  size === s
                    ? "bg-primary text-on-primary border-primary"
                    : "bg-surface text-on-surface border-outline-variant hover:bg-surface-container-low"
                }`}
              >
                {LABEL_SIZE_CONFIG[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* Editor / Preview */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-5 mb-4 shadow-sm">
          <p className="text-sm font-medium text-on-surface mb-4">
            {canCustomizeLabels ? "Edit your label" : "Preview"}
          </p>

          {canCustomizeLabels ? (
            <LabelEditor
              qrCodeId={qrCodeId}
              size={size}
              qrPosition="left"
              elements={elements}
              onChange={setElements}
            />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <PrintLabel qrCodeId={qrCodeId} size={size} elements={elements} />
              <p className="text-xs text-on-surface-variant text-center">
                Upgrade to a paid plan to edit and reposition label fields.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => window.print()}
            className="w-full bg-primary text-on-primary rounded-full px-6 py-3 text-sm font-medium hover:bg-primary-container hover:text-on-primary-container transition-colors"
          >
            Print label
          </button>
          <a
            href={`/items/${itemId}`}
            className="text-sm text-on-surface-variant hover:text-on-surface text-center transition-colors"
          >
            ← Back to item
          </a>
        </div>
      </div>

      {/* Print-only view */}
      <div className="hidden print:block">
        <PrintLabel qrCodeId={qrCodeId} size={size} elements={elements} isPrintTarget />
      </div>
    </>
  );
}
