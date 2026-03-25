"use client";

import { signOut } from "next-auth/react";

export default function MobileHeader() {
  return (
    <header className="sticky top-0 z-40 flex md:hidden items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
      <span className="font-bold text-gray-900 text-base">InventoryAlert</span>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        Sign out
      </button>
    </header>
  );
}
