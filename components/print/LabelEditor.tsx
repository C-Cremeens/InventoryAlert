"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import QRCode from "qrcode";
import { LABEL_SIZE_CONFIG } from "@/lib/label";
import type { LabelSize, TextElement, QrPosition } from "@/lib/label";

// Max on-screen width for the editor canvas. Height is derived from aspect ratio.
const MAX_EDITOR_WIDTH = 480;

// 1 inch = 96px at screen resolution. Labels are 1in tall (or wide for square).
// We scale fonts by (editorH / 96) * (96/72) so 1pt reads correctly in the canvas.
// editorH / 96 = canvas scale; 96/72 = pt-to-px conversion.
function editorFontPx(ptSize: number, editorH: number) {
  return ptSize * (editorH / 96) * (96 / 72);
}

// Minimum pointer movement (px) before a press is treated as a drag, not a click.
const DRAG_THRESHOLD = 4;

interface Props {
  qrCodeId: string;
  size: LabelSize;
  qrPosition: QrPosition;
  elements: TextElement[];
  onChange: (elements: TextElement[]) => void;
}

export default function LabelEditor({ qrCodeId, size, qrPosition, elements, onChange }: Props) {
  const config = LABEL_SIZE_CONFIG[size];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const url = `${baseUrl}/scan/${qrCodeId}`;

  // Derive on-screen dimensions preserving label aspect ratio, capped at MAX_EDITOR_WIDTH
  const labelAspect = parseFloat(config.width) / parseFloat(config.height);
  const editorW = Math.min(MAX_EDITOR_WIDTH, Math.round(labelAspect * 180));
  const editorH = Math.round(editorW / labelAspect);

  // QR code scaled proportionally to the canvas
  const qrDisplaySize = Math.round(config.qrSize * (editorH / 96));
  // QR left offset: same proportion as the 0.05in padding used in PrintLabel
  const qrLeft = Math.round(editorW * (0.05 / parseFloat(config.width)));

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: qrDisplaySize, margin: 1 });
    }
  }, [url, qrDisplaySize]);

  const [editingId, setEditingId] = useState<string | null>(null);

  // Drag tracking — stored in a ref so pointer handlers don't need to re-subscribe
  const drag = useRef<{
    id: string;
    startMouseX: number;
    startMouseY: number;
    startElX: number;
    startElY: number;
    moved: boolean;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      // Don't start drag if clicking the inline input
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      e.preventDefault();
      const el = elements.find((t) => t.id === id);
      if (!el) return;
      drag.current = {
        id,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startElX: el.x,
        startElY: el.y,
        moved: false,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [elements]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag.current) return;
      const dx = e.clientX - drag.current.startMouseX;
      const dy = e.clientY - drag.current.startMouseY;
      if (!drag.current.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      drag.current.moved = true;
      const { id, startElX, startElY } = drag.current;
      onChange(
        elements.map((el) =>
          el.id === id
            ? {
                ...el,
                x: Math.max(0, Math.min(95, startElX + (dx / editorW) * 100)),
                y: Math.max(0, Math.min(90, startElY + (dy / editorH) * 100)),
              }
            : el
        )
      );
    },
    [elements, onChange, editorW, editorH]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent, id: string) => {
      if (!drag.current) return;
      const wasDrag = drag.current.moved;
      drag.current = null;
      // Only toggle selection when it was a pure click, not a drag
      if (!wasDrag) {
        setEditingId((prev) => (prev === id ? null : id));
      }
    },
    []
  );

  const onContainerPointerUp = useCallback(() => {
    drag.current = null;
  }, []);

  const updateText = (id: string, text: string) => {
    onChange(elements.map((el) => (el.id === id ? { ...el, text } : el)));
  };

  const deleteElement = (id: string) => {
    setEditingId(null);
    onChange(elements.filter((el) => el.id !== id));
  };

  const addElement = () => {
    const newEl: TextElement = {
      id: `custom-${Date.now()}`,
      text: "Custom text",
      x: 30,
      y: 50,
      fontSize: 6,
      bold: false,
    };
    onChange([...elements, newEl]);
    setEditingId(newEl.id);
  };

  const selectedEl = elements.find((e) => e.id === editingId);

  return (
    <div className="flex flex-col items-start gap-3 w-full">
      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative bg-white border border-outline-variant shadow-sm select-none overflow-hidden"
        style={{ width: editorW, height: editorH }}
        onPointerMove={onPointerMove}
        onPointerUp={onContainerPointerUp}
        onPointerLeave={onContainerPointerUp}
        onClick={() => setEditingId(null)}
      >
        {/* QR code — position controlled by qrPosition prop */}
        <div
          style={{
            position: "absolute",
            pointerEvents: "none",
            ...(config.layout === "square"
              ? { top: qrLeft, left: "50%", transform: "translateX(-50%)" }
              : qrPosition === "center"
              ? { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
              : qrPosition === "right"
              ? { top: "50%", right: qrLeft, transform: "translateY(-50%)" }
              : { top: "50%", left: qrLeft, transform: "translateY(-50%)" }),
          }}
        >
          <canvas ref={canvasRef} />
        </div>

        {/* Draggable text elements */}
        {elements.map((el) => {
          const isEditing = editingId === el.id;
          const fPx = editorFontPx(el.fontSize, editorH);
          return (
            <div
              key={el.id}
              style={{
                position: "absolute",
                left: `${el.x}%`,
                top: `${el.y}%`,
                cursor: isEditing ? "default" : "grab",
                zIndex: isEditing ? 10 : 1,
                touchAction: "none",
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                onPointerDown(e, el.id);
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                onPointerUp(e, el.id);
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {isEditing ? (
                <input
                  autoFocus
                  value={el.text}
                  onChange={(e) => updateText(el.id, e.target.value)}
                  className="border border-primary rounded outline-none bg-white/95 px-0.5"
                  style={{
                    fontSize: fPx,
                    fontWeight: el.bold ? "bold" : "normal",
                    minWidth: 40,
                    width: `${Math.max(el.text.length + 2, 8)}ch`,
                    lineHeight: 1.2,
                  }}
                />
              ) : (
                <span
                  className="ring-1 ring-transparent hover:ring-primary/50 rounded px-0.5"
                  style={{
                    fontSize: fPx,
                    fontWeight: el.bold ? "bold" : "normal",
                    whiteSpace: "nowrap",
                    lineHeight: 1.2,
                    display: "block",
                    color: "#111",
                  }}
                >
                  {el.text || <span className="text-outline italic">empty</span>}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-on-surface-variant">
        Click to select · Double-click text to edit · Drag to reposition
      </p>

      {/* Toolbar — rendered below the canvas, not inside it */}
      {selectedEl && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() =>
              onChange(elements.map((e) => e.id === editingId ? { ...e, bold: !e.bold } : e))
            }
            className={`text-xs px-2 py-1 rounded border font-bold transition-colors ${
              selectedEl.bold
                ? "bg-primary text-on-primary border-primary"
                : "bg-surface text-on-surface border-outline-variant hover:bg-surface-container"
            }`}
          >
            B
          </button>
          <button
            onClick={() =>
              onChange(elements.map((e) => e.id === editingId ? { ...e, fontSize: Math.max(4, e.fontSize - 1) } : e))
            }
            className="text-xs px-2 py-1 rounded border bg-surface text-on-surface border-outline-variant hover:bg-surface-container"
          >
            A−
          </button>
          <span className="text-xs text-on-surface-variant w-8 text-center">
            {selectedEl.fontSize}pt
          </span>
          <button
            onClick={() =>
              onChange(elements.map((e) => e.id === editingId ? { ...e, fontSize: Math.min(24, e.fontSize + 1) } : e))
            }
            className="text-xs px-2 py-1 rounded border bg-surface text-on-surface border-outline-variant hover:bg-surface-container"
          >
            A+
          </button>
          <button
            onClick={() => deleteElement(editingId!)}
            className="text-xs px-2 py-1 rounded border bg-surface text-error border-error/30 hover:bg-error-container hover:text-on-error-container ml-2 transition-colors"
          >
            Remove
          </button>
        </div>
      )}

      <button
        onClick={addElement}
        className="text-xs font-medium text-secondary hover:text-on-secondary-container underline"
      >
        + Add text field
      </button>
    </div>
  );
}
