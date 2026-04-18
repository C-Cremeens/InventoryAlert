export const LABEL_SIZES = ["3x1", "2x1", "1x1"] as const;
export type LabelSize = (typeof LABEL_SIZES)[number];

export const LABEL_SIZE_CONFIG: Record<
  LabelSize,
  { width: string; height: string; label: string; qrSize: number; layout: "landscape" | "square" }
> = {
  "3x1": { width: "3in",  height: "1in", label: '3" × 1"', qrSize: 80,  layout: "landscape" },
  "2x1": { width: "2in",  height: "1in", label: '2" × 1"', qrSize: 72,  layout: "landscape" },
  "1x1": { width: "1in",  height: "1in", label: '1" × 1"', qrSize: 78,  layout: "square"    },
};

export type QrPosition = "left" | "center" | "right";

export interface TextElement {
  id: string;
  text: string;
  x: number;       // 0–100 (% of label width)
  y: number;       // 0–100 (% of label height)
  fontSize: number; // pt
  bold: boolean;
}

// Persisted shape stored in InventoryItem.labelLayout (Json)
export interface LabelLayout {
  size: LabelSize;
  qrPosition: QrPosition;
  elements: TextElement[];
}

interface DefaultElementOptions {
  itemName: string;
  description?: string | null;
  lowStockThreshold?: number | null;
  size: LabelSize;
  qrPosition?: QrPosition;
}

export function getDefaultTextElements({
  itemName,
  description,
  lowStockThreshold,
  size,
  qrPosition = "left",
}: DefaultElementOptions): TextElement[] {
  const isSquare = LABEL_SIZE_CONFIG[size].layout === "square";

  // Square (1×1): QR fills top ~80%, name sits below
  if (isSquare) {
    return [{ id: "name", text: itemName, x: 5, y: 78, fontSize: 5, bold: true }];
  }

  // Landscape: place text in the open space opposite the QR code.
  // QR occupies roughly 28% (3×1) or 38% (2×1) of the width.
  const qrWidthPct = size === "3x1" ? 28 : 38;
  const nameFontSize = size === "3x1" ? 8 : 7;

  let textStartX: number;
  if (qrPosition === "left") {
    textStartX = qrWidthPct + 2;
  } else {
    // center or right: text goes on the left side
    textStartX = 3;
  }

  const elements: TextElement[] = [
    { id: "name", text: itemName, x: textStartX, y: 12, fontSize: nameFontSize, bold: true },
  ];

  let nextY = 35;

  if (description) {
    elements.push({
      id: "description",
      text: description,
      x: textStartX,
      y: nextY,
      fontSize: 6,
      bold: false,
    });
    nextY += 22;
  }

  if (lowStockThreshold) {
    elements.push({
      id: "lowstock",
      text: `Restock when below: ${lowStockThreshold}`,
      x: textStartX,
      y: nextY,
      fontSize: 6,
      bold: false,
    });
    nextY += 22;
  }

  elements.push({
    id: "hint",
    text: "Scan to request restocking",
    x: textStartX,
    y: Math.min(nextY, 78),
    fontSize: 5,
    bold: false,
  });

  return elements;
}
