"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface Props {
  qrCodeId: string;
  size?: number;
}

export default function QRCodeDisplay({ qrCodeId, size = 160 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const url = `${baseUrl}/scan/${qrCodeId}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: size,
        margin: 1,
      });
    }
  }, [url, size]);

  return <canvas ref={canvasRef} width={size} height={size} />;
}
