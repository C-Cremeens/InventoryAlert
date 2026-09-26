import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function VerifyAccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.emailVerifiedAt) redirect("/dashboard");
  return (
    <main className="mx-auto max-w-md space-y-4 p-8">
      <h1 className="text-2xl font-bold">Verify your email</h1>
      <p>
        Check your inbox for a link to verify your email and choose your
        password. This protects your account before you start sending inventory
        alerts.
      </p>
      <p>
        Verification signs out existing sessions. Sign in again after completing
        it.
      </p>
      <Link className="text-blue-700 underline" href="/forgot-password">
        Send another verification or recovery link
      </Link>
    </main>
  );
}
