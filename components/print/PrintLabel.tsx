"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { LABEL_SIZE_CONFIG } from "@/lib/label";
import type { LabelSize, TextElement, QrPosition } from "@/lib/label";

interface Props {
  qrCodeId: string;
  size?: LabelSize;
  qrPosition?: QrPosition;
  elements: TextElement[];
  isPrintTarget?: boolean;
}

function qrStyle(
  layout: "landscape" | "square",
  qrPosition: QrPosition
): React.CSSProperties {
  if (layout === "square") {
    return { position: "absolute", top: "0.05in", left: "50%", transform: "translateX(-50%)" };
  }
  if (qrPosition === "center") {
    return { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }
  if (qrPosition === "right") {
    return { position: "absolute", top: "50%", right: "0.05in", transform: "translateY(-50%)" };
  }
  // left (default)
  return { position: "absolute", top: "50%", left: "0.05in", transform: "translateY(-50%)" };
}

export default function PrintLabel({
  qrCodeId,
  size = "3x1",
  qrPosition = "left",
  elements,
  isPrintTarget = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const url = `${baseUrl}/scan/${qrCodeId}`;
  const config = LABEL_SIZE_CONFIG[size];

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: config.qrSize, margin: 1 });
    }
  }, [url, config.qrSize]);

  return (
    <div
      id={isPrintTarget ? "print-label" : undefined}
      className="bg-white overflow-hidden"
      style={{ width: config.width, height: config.height, position: "relative" }}
    >
      <div style={qrStyle(config.layout, qrPosition)}>
        <canvas ref={canvasRef} />
      </div>

      {elements.map((el) => (
        <span
          key={el.id}
          style={{
            position: "absolute",
            left: `${el.x}%`,
            top: `${el.y}%`,
            fontSize: `${el.fontSize}pt`,
            fontWeight: el.bold ? "bold" : "normal",
            whiteSpace: "nowrap",
            color: "#111",
            lineHeight: 1.2,
          }}
        >
          {el.text}
        </span>
      ))}
    </div>
  );
}
