import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HomePage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900">
      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        {/* QR icon */}
        <div className="mb-6 p-4 bg-white/10 rounded-2xl">
          <svg
            className="w-12 h-12 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 17.25h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z"
            />
          </svg>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
          InventoryAlert
        </h1>
        <p className="text-lg sm:text-xl text-blue-100 max-w-sm mb-10">
          Stock alerts, zero friction. Scan a QR label, trigger a restock notification — no app required.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none sm:justify-center">
          <Link
            href="/register"
            className="bg-white text-blue-700 rounded-xl px-8 py-3 text-base font-semibold hover:bg-blue-50 transition-colors text-center"
          >
            Get started free
          </Link>
          <Link
            href="/login"
            className="border-2 border-white/50 text-white rounded-xl px-8 py-3 text-base font-semibold hover:bg-white/10 transition-colors text-center"
          >
            Sign in
          </Link>
        </div>
      </main>

      {/* Features */}
      <section className="px-6 pb-12">
        <div className="max-w-lg mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FeatureCard
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            }
            title="Scan any QR"
            description="Print and stick labels on any shelf or container."
          />
          <FeatureCard
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            }
            title="Instant alerts"
            description="Get an email the moment someone scans a low-stock label."
          />
          <FeatureCard
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 8.25h3m-3 3h3m-3 3h3" />
              </svg>
            }
            title="No app needed"
            description="Anyone with a phone camera can trigger a restock request."
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white/10 rounded-2xl p-5 text-left">
      <div className="text-blue-200 mb-3">{icon}</div>
      <h3 className="text-white font-semibold mb-1">{title}</h3>
      <p className="text-blue-200 text-sm">{description}</p>
    </div>
  );
}
