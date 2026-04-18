import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import MobileHeader from "@/components/layout/MobileHeader";
import BottomNav from "@/components/layout/BottomNav";
import InstallBanner from "@/components/InstallBanner";
import { SessionProvider } from "next-auth/react";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <SessionProvider session={session}>
      <div className="flex flex-col min-h-screen bg-background">
        <MobileHeader />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 overflow-auto pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
            <div className="p-4 md:p-8">{children}</div>
          </main>
        </div>
        <BottomNav />
        <InstallBanner />
        <Link
          href="/items/new"
          className="fixed bottom-28 right-6 z-40 md:hidden w-14 h-14 flex items-center justify-center bg-gradient-to-br from-primary to-primary-container text-white rounded-2xl shadow-lg active:scale-95 transition-transform"
          aria-label="Add new item"
        >
          <span className="material-symbols-outlined">add</span>
        </Link>
      </div>
    </SessionProvider>
  );
}
