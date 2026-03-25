import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import MobileHeader from "@/components/layout/MobileHeader";
import BottomNav from "@/components/layout/BottomNav";
import { SessionProvider } from "next-auth/react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <SessionProvider session={session}>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <MobileHeader />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 overflow-auto pb-20 md:pb-0">
            <div className="p-4 md:p-8">{children}</div>
          </main>
        </div>
        <BottomNav />
      </div>
    </SessionProvider>
  );
}
