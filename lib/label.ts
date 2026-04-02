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
