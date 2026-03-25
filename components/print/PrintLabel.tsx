"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface Props {
  itemName: string;
  qrCodeId: string;
}

export default function PrintLabel({ itemName, qrCodeId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const url = `${baseUrl}/scan/${qrCodeId}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 280,
        margin: 1,
      });
    }
  }, [url]);

  return (
    <div
      id="print-label"
      className="flex flex-col items-center justify-center gap-4 p-8 bg-white"
      style={{ width: "3.5in", minHeight: "3.5in" }}
    >
      <canvas ref={canvasRef} />
      <p
        className="text-center font-bold text-gray-900 text-xl leading-tight"
        style={{ maxWidth: "3in" }}
      >
        {itemName}
      </p>
      <p className="text-xs text-gray-400">Scan to request restocking</p>
    </div>
  );
}
