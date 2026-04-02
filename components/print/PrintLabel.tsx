"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { LABEL_SIZE_CONFIG } from "@/lib/label";
import type { LabelSize } from "@/lib/label";

interface Props {
  itemName: string;
  qrCodeId: string;
  size?: LabelSize;
  description?: string | null;
  lowStockThreshold?: number | null;
  showDescription?: boolean;
  showLowStock?: boolean;
}

export default function PrintLabel({
  itemName,
  qrCodeId,
  size = "3x1",
  description,
  lowStockThreshold,
  showDescription = false,
  showLowStock = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const url = `${baseUrl}/scan/${qrCodeId}`;
  const config = LABEL_SIZE_CONFIG[size];

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: config.qrSize,
        margin: 1,
      });
    }
  }, [url, config.qrSize]);

  if (config.layout === "square") {
    return (
      <div
        id="print-label"
        className="flex flex-col items-center justify-center bg-white overflow-hidden"
        style={{ width: config.width, height: config.height }}
      >
        <canvas ref={canvasRef} />
        <p
          className="text-center font-bold text-gray-900 leading-tight"
          style={{ fontSize: "5pt", maxWidth: "0.9in" }}
        >
          {itemName}
        </p>
      </div>
    );
  }

  // Landscape layout (3x1, 2x1)
  return (
    <div
      id="print-label"
      className="flex flex-row items-center bg-white overflow-hidden"
      style={{ width: config.width, height: config.height, padding: "0.05in" }}
    >
      <div
        className="flex-shrink-0 flex items-center justify-center"
        style={{ width: `${config.qrSize}px` }}
      >
        <canvas ref={canvasRef} />
      </div>
      <div className="flex flex-col justify-center overflow-hidden" style={{ flex: 1, paddingLeft: "0.06in" }}>
        <p
          className="font-bold text-gray-900 leading-tight truncate"
          style={{ fontSize: size === "3x1" ? "8pt" : "7pt" }}
        >
          {itemName}
        </p>
        {showDescription && description && (
          <p className="text-gray-600 leading-tight truncate" style={{ fontSize: "6pt" }}>
            {description}
          </p>
        )}
        {showLowStock && lowStockThreshold && (
          <p className="text-orange-600 leading-tight" style={{ fontSize: "6pt" }}>
            Restock when below: {lowStockThreshold}
          </p>
        )}
        <p className="text-gray-400 leading-tight" style={{ fontSize: "5pt" }}>
          Scan to request restocking
        </p>
      </div>
    </div>
  );
}
