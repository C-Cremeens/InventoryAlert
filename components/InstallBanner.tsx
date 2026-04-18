"use client";

import { useState, useEffect } from "react";

const LS_KEY = "pwa-install-dismissed";

type OS = "ios" | "android" | "desktop";

export default function InstallBanner() {
  const [os, setOs] = useState<OS | null>(null);
  const [visible, setVisible] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    if (localStorage.getItem(LS_KEY) === "true") return;

    const ua = navigator.userAgent;
    let detectedOs: OS;
    if (/iPad|iPhone|iPod/.test(ua)) {
      detectedOs = "ios";
    } else if (/Android/.test(ua)) {
      detectedOs = "android";
    } else {
      detectedOs = "desktop";
    }

    setOs(detectedOs);
    setVisible(true);
    requestAnimationFrame(() => setShown(true));
  }, []);

  function handleDismiss() {
    localStorage.setItem(LS_KEY, "true");
    setShown(false);
    setTimeout(() => setVisible(false), 300);
  }

  if (!visible || !os) return null;

  return (
    <div
      className={[
        "fixed z-[49] md:z-50",
        "inset-x-0 md:inset-x-auto",
        "bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-6",
        "px-4 md:px-0 md:right-6 md:w-80",
        "transition-all duration-300 ease-out",
        shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
      ].join(" ")}
      role="dialog"
      aria-modal="false"
      aria-label="Install InventoryAlert"
    >
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-outline-variant/50 p-4">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-primary text-[24px] leading-none mt-0.5">
            {os === "desktop" ? "install_desktop" : "smartphone"}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-on-surface leading-snug">
              Add InventoryAlert to your home screen
            </p>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="flex-shrink-0 p-1 -mr-1 -mt-1 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[20px] leading-none">close</span>
          </button>
        </div>

        <div className="mt-3 text-xs text-on-surface-variant">
          {os === "ios" && (
            <p className="leading-relaxed">
              Tap the{" "}
              <span className="inline-flex items-center gap-0.5 font-medium text-on-surface">
                <span className="material-symbols-outlined text-[15px] leading-none align-text-bottom">ios_share</span>
                {" "}Share
              </span>{" "}
              icon at the bottom of Safari, then tap{" "}
              <span className="inline-flex items-center gap-0.5 font-medium text-on-surface">
                <span className="material-symbols-outlined text-[15px] leading-none align-text-bottom">add_to_home_screen</span>
                {" "}Add to Home Screen
              </span>.
            </p>
          )}
          {os === "android" && (
            <p className="leading-relaxed">
              Tap the{" "}
              <span className="inline-flex items-center gap-0.5 font-medium text-on-surface">
                <span className="material-symbols-outlined text-[15px] leading-none align-text-bottom">more_vert</span>
                {" "}menu
              </span>{" "}
              in Chrome, then tap{" "}
              <span className="font-medium text-on-surface">Add to Home Screen</span>{" "}
              or{" "}
              <span className="font-medium text-on-surface">Install app</span>.
            </p>
          )}
          {os === "desktop" && (
            <p className="leading-relaxed">
              Click the{" "}
              <span className="inline-flex items-center gap-0.5 font-medium text-on-surface">
                <span className="material-symbols-outlined text-[15px] leading-none align-text-bottom">install_desktop</span>
                {" "}install icon
              </span>{" "}
              in the browser address bar, or open the browser menu and choose{" "}
              <span className="font-medium text-on-surface">Install InventoryAlert</span>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
