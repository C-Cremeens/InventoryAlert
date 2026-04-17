"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/items", label: "Inventory", icon: "inventory_2" },
  { href: "/requests", label: "Stocking Requests", icon: "notifications" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-60 bg-surface-container-lowest border-r border-outline-variant flex-col min-h-screen">
      <div className="px-5 py-5 border-b border-outline-variant">
        <span className="font-headline font-bold text-primary text-lg">InventoryAlert</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-primary-fixed text-primary font-semibold"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-outline-variant">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-left px-3 py-2 text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
