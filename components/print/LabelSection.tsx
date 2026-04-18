"use client";

import { useState } from "react";
import PrintLabel from "@/components/print/PrintLabel";
import LabelEditor from "@/components/print/LabelEditor";
import { LABEL_SIZES, LABEL_SIZE_CONFIG, getDefaultTextElements } from "@/lib/label";
import type { LabelSize, LabelLayout, QrPosition, TextElement } from "@/lib/label";

const QR_POSITIONS: { value: QrPosition; label: string; icon: string }[] = [
  { value: "left",   label: "Left",   icon: "align_justify_flex_start" },
  { value: "center", label: "Center", icon: "align_justify_center" },
  { value: "right",  label: "Right",  icon: "align_justify_flex_end" },
];

interface Props {
  itemId: string;
  qrCodeId: string;
  itemName: string;
  description?: string | null;
  lowStockThreshold?: number | null;
  savedLayout?: LabelLayout | null;
  canCustomizeLabels: boolean;
}

export default function LabelSection({
  itemId,
  qrCodeId,
  itemName,
  description,
  lowStockThreshold,
  savedLayout,
  canCustomizeLabels,
}: Props) {
  const initialSize: LabelSize = savedLayout?.size ?? "3x1";
  const initialQrPosition: QrPosition = savedLayout?.qrPosition ?? "left";
  const initialElements: TextElement[] =
    savedLayout?.elements ??
    getDefaultTextElements({ itemName, description, lowStockThreshold, size: initialSize, qrPosition: initialQrPosition });

  const [size, setSize] = useState<LabelSize>(initialSize);
  const [qrPosition, setQrPosition] = useState<QrPosition>(initialQrPosition);
  const [elements, setElements] = useState<TextElement[]>(initialElements);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const isSquare = LABEL_SIZE_CONFIG[size].layout === "square";

  const handleSizeChange = (newSize: LabelSize) => {
    setSize(newSize);
    if (!savedLayout) {
      setElements(getDefaultTextElements({ itemName, description, lowStockThreshold, size: newSize, qrPosition }));
    }
    setSaveState("idle");
  };

  const handleQrPositionChange = (newPos: QrPosition) => {
    setQrPosition(newPos);
    setSaveState("idle");
  };

  const resetToDefaults = () => {
    setElements(getDefaultTextElements({ itemName, description, lowStockThreshold, size, qrPosition }));
    setSaveState("idle");
  };

  const saveLayout = async () => {
    setSaveState("saving");
    try {
      const res = await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelLayout: { size, qrPosition, elements } }),
      });
      if (!res.ok) throw new Error();
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  };

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-5 shadow-sm mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-on-surface">Label</p>
        <div className="flex items-center gap-2 print:hidden">
          {canCustomizeLabels && (
            <button
              onClick={saveLayout}
              disabled={saveState === "saving"}
              className={`text-xs font-medium rounded-full px-3 py-1 border transition-colors ${
                saveState === "saved"
                  ? "bg-secondary text-on-secondary border-secondary"
                  : saveState === "error"
                  ? "bg-error-container text-on-error-container border-error/30"
                  : "bg-primary text-on-primary border-primary hover:bg-primary-container hover:text-on-primary-container disabled:opacity-50"
              }`}
            >
              {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Error — retry" : "Save layout"}
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="text-xs font-medium text-on-surface border border-outline-variant rounded-full px-3 py-1 hover:bg-surface-container-low transition-colors"
          >
            Print
          </button>
        </div>
      </div>

      {/* Size selector */}
      <div className="flex gap-2 mb-3 print:hidden">
        {LABEL_SIZES.map((s) => (
          <button
            key={s}
            onClick={() => handleSizeChange(s)}
            className={`flex-1 py-1.5 px-2 rounded-full text-xs font-medium border transition-colors ${
              size === s
                ? "bg-primary text-on-primary border-primary"
                : "bg-surface text-on-surface border-outline-variant hover:bg-surface-container-low"
            }`}
          >
            {LABEL_SIZE_CONFIG[s].label}
          </button>
        ))}
      </div>

      {/* Editor or static preview */}
      {canCustomizeLabels ? (
        <LabelEditor
          qrCodeId={qrCodeId}
          size={size}
          qrPosition={qrPosition}
          elements={elements}
          onChange={(els) => { setElements(els); setSaveState("idle"); }}
        />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <PrintLabel qrCodeId={qrCodeId} size={size} qrPosition={qrPosition} elements={elements} />
          <p className="text-xs text-on-surface-variant text-center">
            Upgrade to edit and reposition label fields.
          </p>
        </div>
      )}

      {/* QR position buttons — landscape labels only */}
      {canCustomizeLabels && !isSquare && (
        <div className="flex items-center gap-2 mt-4 print:hidden">
          <span className="text-xs text-on-surface-variant mr-1">QR position</span>
          {QR_POSITIONS.map(({ value, label, icon }) => (
            <button
              key={value}
              onClick={() => handleQrPositionChange(value)}
              title={label}
              className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                qrPosition === value
                  ? "bg-primary text-on-primary border-primary"
                  : "bg-surface text-on-surface border-outline-variant hover:bg-surface-container-low"
              }`}
            >
              <span className="material-symbols-outlined text-[14px] leading-none">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Reset link */}
      {canCustomizeLabels && (
        <button
          onClick={resetToDefaults}
          className="mt-3 text-xs text-on-surface-variant hover:text-on-surface underline print:hidden"
        >
          Reset to defaults
        </button>
      )}

      {/* Hidden print target */}
      <div className="hidden print:block">
        <PrintLabel qrCodeId={qrCodeId} size={size} qrPosition={qrPosition} elements={elements} isPrintTarget />
      </div>
    </div>
  );
}
