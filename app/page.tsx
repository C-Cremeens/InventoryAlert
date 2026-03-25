import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HomePage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">InventoryAlert</h1>
        <p className="text-gray-500 mb-8 text-base">
          QR-based inventory alerts. Scan a label, trigger a low-stock
          notification. No app required.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/register"
            className="bg-blue-600 text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Get started free
          </Link>
          <Link
            href="/login"
            className="border border-gray-300 text-gray-700 rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
