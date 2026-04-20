"use client";

import { Suspense, useEffect, useState } from "react";
import { getProviders, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { GOOGLE_SIGNIN_REQUIRED_CODE } from "@/lib/auth-errors";

function Divider() {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-200" />
      </div>
      <div className="relative flex justify-center text-xs uppercase tracking-wide text-gray-400">
        <span className="bg-white px-3">Or continue with email</span>
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const passwordReset = searchParams.get("reset") === "1";
  const registered = searchParams.get("registered") === "1";
  const registerHref =
    callbackUrl === "/dashboard"
      ? "/register"
      : `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const forgotPasswordHref =
    callbackUrl === "/dashboard"
      ? "/forgot-password"
      : `/forgot-password?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [googleOnlyError, setGoogleOnlyError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    let active = true;

    getProviders()
      .then((providers) => {
        if (active) {
          setGoogleEnabled(Boolean(providers?.google));
        }
      })
      .catch(() => {
        if (active) {
          setGoogleEnabled(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleGoogleSignIn() {
    setError("");
    setGoogleOnlyError(false);
    setGoogleLoading(true);

    try {
      await signIn("google", { redirectTo: callbackUrl });
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setGoogleOnlyError(false);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      redirectTo: callbackUrl,
    });

    setLoading(false);

    if (result?.error) {
      if (result.code === GOOGLE_SIGNIN_REQUIRED_CODE) {
        setGoogleOnlyError(true);
        setError(
          "This account uses Google sign-in. Continue with Google or use Forgot password to create a password."
        );
        return;
      }

      setError("Invalid email or password.");
      return;
    }

    router.push(result?.url ?? callbackUrl);
  }

  return (
    <>
      {registered && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-4">
          Account created. Sign in to continue.
        </div>
      )}
      {passwordReset && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-4">
          Password updated. You can now sign in with your new password.
        </div>
      )}

      <div className="space-y-4">
        {googleEnabled && (
          <>
            <GoogleSignInButton
              label={googleLoading ? "Connecting to Google..." : "Continue with Google"}
              disabled={loading || googleLoading}
              onClick={handleGoogleSignIn}
            />
            <Divider />
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              <p>{error}</p>
              {googleOnlyError && (
                <p className="mt-2">
                  <Link
                    href={forgotPasswordHref}
                    className="font-medium text-red-700 underline"
                  >
                    Send yourself a password setup link
                  </Link>
                </p>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="text-right mt-1">
              <Link href={forgotPasswordHref} className="text-xs text-blue-600 hover:underline">
                Forgot password?
              </Link>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-gray-500 mt-6">
        Don&apos;t have an account?{" "}
        <Link href={registerHref} className="text-blue-600 hover:underline">
          Sign up free
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">InventoryAlert</h1>
          <p className="text-gray-500 mt-1 text-sm">Sign in to your account</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
