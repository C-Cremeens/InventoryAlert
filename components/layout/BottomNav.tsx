"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/items", label: "Inventory", icon: "inventory_2" },
  { href: "/requests", label: "Requests", icon: "notifications" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-white/60 backdrop-blur-xl rounded-t-3xl pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center py-2"
            >
              {active ? (
                <div className="flex flex-col items-center gap-0.5 px-4 py-2 bg-gradient-to-br from-primary to-primary-container text-white rounded-2xl">
                  <span className="material-symbols-outlined text-[22px] leading-none">{item.icon}</span>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-0.5 py-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[22px] leading-none">{item.icon}</span>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
