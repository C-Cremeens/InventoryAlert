"use client";

import { signOut } from "next-auth/react";

export default function MobileHeader() {
  return (
    <header className="sticky top-0 z-40 flex md:hidden items-center justify-between px-4 py-3 bg-slate-50/60 backdrop-blur-xl shadow-[0_20px_40px_rgba(25,28,30,0.06)]">
      <span className="font-headline font-bold text-primary text-base">InventoryAlert</span>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="text-sm text-on-surface-variant hover:text-on-surface transition-colors"
      >
        Sign out
      </button>
    </header>
  );
}
