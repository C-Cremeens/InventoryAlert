import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TIER_LIMITS } from "@/lib/tier";
import type { Tier } from "@prisma/client";

const PRICING_TIERS: {
  key: Tier;
  description: string;
  cta: string;
  highlight: boolean;
  accentClass: string;
  ctaClass: string;
  badge?: string;
}[] = [
  {
    key: "FREE",
    description: "Perfect for trying it out or managing a small space.",
    cta: "Get started free",
    highlight: false,
    accentClass: "border-gray-200",
    ctaClass: "bg-gray-900 text-white hover:bg-gray-700",
  },
  {
    key: "FAMILY",
    description: "Unlimited items for homes, small businesses, and growing teams.",
    cta: "Start Family plan",
    highlight: true,
    accentClass: "border-blue-500 ring-2 ring-blue-500",
    ctaClass: "bg-blue-600 text-white hover:bg-blue-700",
    badge: "Most popular",
  },
  {
    key: "ENTERPRISE",
    description: "Full power with custom labels for larger operations.",
    cta: "Start Enterprise plan",
    highlight: false,
    accentClass: "border-purple-200",
    ctaClass: "bg-purple-600 text-white hover:bg-purple-700",
  },
];

export default async function HomePage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900">
        <main className="flex flex-col items-center justify-center px-6 py-20 text-center">
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

          <h1 className="text-4xl sm:text-6xl font-bold text-white mb-4 tracking-tight">
            InventoryAlert
          </h1>
          <p className="text-lg sm:text-xl text-blue-100 max-w-lg mb-4">
            Stock alerts, zero friction.
          </p>
          <p className="text-base text-blue-200 max-w-md mb-10">
            Print QR labels, stick them on any shelf or bin, and get an instant email the moment
            someone scans a low-stock item — no app required.
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

        {/* How it works */}
        <section className="px-6 pb-16">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-center text-white font-semibold text-lg mb-8 tracking-wide uppercase opacity-80">
              How it works
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <Step number={1} title="Print & place" description="Generate QR labels in seconds and stick them on any shelf, bin, or container." />
              <Step number={2} title="Scan when low" description="When stock runs low, anyone with a phone camera scans the label — no app, no login needed." />
              <Step number={3} title="Get notified" description="You receive an instant email alert with item details so you can reorder right away." />
            </div>
          </div>
        </section>
      </div>

      {/* Features */}
      <section className="bg-gray-50 px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-gray-900 font-bold text-2xl mb-2">
            Everything you need to stay stocked
          </h2>
          <p className="text-center text-gray-500 mb-10">
            Simple by design. Powerful where it counts.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <FeatureCard
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75z" />
                </svg>
              }
              title="Scan any QR"
              description="Print labels in seconds and stick them anywhere — shelves, bins, storage rooms, supply closets."
            />
            <FeatureCard
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              }
              title="Instant alerts"
              description="Get a restock email the moment someone scans a low-stock label — with item name, description, and scan time."
            />
            <FeatureCard
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 8.25h3m-3 3h3m-3 3h3" />
                </svg>
              }
              title="No app needed"
              description="Any phone camera works. The person scanning doesn't need to install anything or create an account."
            />
            <FeatureCard
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
              }
              title="Request tracking"
              description="Every scan is logged. Review pending restock requests, approve or decline them, and keep a full history."
            />
            <FeatureCard
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
              }
              title="Flexible pricing"
              description="Start free with up to 5 items. Upgrade when you grow — no contracts, cancel any time."
            />
            <FeatureCard
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                </svg>
              }
              title="Custom labels"
              description="Enterprise users can add custom branding and descriptions to labels — perfect for client-facing operations."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-white px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-gray-900 font-bold text-2xl mb-2">
            Simple, transparent pricing
          </h2>
          <p className="text-center text-gray-500 mb-10">
            Start free. Upgrade as you grow. No hidden fees.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {PRICING_TIERS.map((t) => {
              const tier = TIER_LIMITS[t.key];
              const itemsLabel =
                tier.maxItems === Infinity
                  ? "Unlimited inventory items"
                  : `Up to ${tier.maxItems} inventory items`;
              const [price, period] = tier.price.split("/");
              return (
                <PricingCard
                  key={t.key}
                  name={tier.label}
                  price={price}
                  period={`/${period}`}
                  description={t.description}
                  features={[
                    { label: itemsLabel, included: true },
                    { label: "QR label generation", included: true },
                    { label: "Email restock alerts", included: true },
                    { label: "Request tracking", included: true },
                    { label: "Custom labels", included: tier.customLabels },
                  ]}
                  cta={t.cta}
                  href="/register"
                  highlight={t.highlight}
                  accentClass={t.accentClass}
                  ctaClass={t.ctaClass}
                  badge={t.badge}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 px-6 py-8 text-center">
        <p className="text-gray-500 text-sm mb-3">
          InventoryAlert — stock alerts, zero friction.
        </p>
        <div className="flex justify-center gap-4 text-sm">
          <Link href="/register" className="text-blue-600 hover:underline">Register</Link>
          <Link href="/login" className="text-blue-600 hover:underline">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-10 h-10 rounded-full bg-white/20 text-white font-bold flex items-center justify-center text-lg mb-3">
        {number}
      </div>
      <h3 className="text-white font-semibold mb-1">{title}</h3>
      <p className="text-blue-200 text-sm">{description}</p>
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
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="text-blue-600 mb-3">{icon}</div>
      <h3 className="text-gray-900 font-semibold mb-1">{title}</h3>
      <p className="text-gray-500 text-sm">{description}</p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  period,
  description,
  features,
  cta,
  href,
  highlight,
  accentClass,
  ctaClass,
  badge,
}: {
  name: string;
  price: string;
  period: string;
  description: string;
  features: { label: string; included: boolean }[];
  cta: string;
  href: string;
  highlight: boolean;
  accentClass: string;
  ctaClass: string;
  badge?: string;
}) {
  return (
    <div className={`relative rounded-2xl border p-6 flex flex-col ${accentClass} ${highlight ? "bg-blue-50" : "bg-white"}`}>
      {badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
          {badge}
        </span>
      )}
      <div className="mb-4">
        <h3 className="font-bold text-gray-900 text-lg">{name}</h3>
        <div className="flex items-end gap-1 mt-1">
          <span className="text-3xl font-bold text-gray-900">{price}</span>
          <span className="text-gray-500 text-sm mb-1">{period}</span>
        </div>
        <p className="text-gray-500 text-sm mt-2">{description}</p>
      </div>
      <ul className="space-y-2 mb-6 flex-1">
        {features.map((f) => (
          <li key={f.label} className="flex items-center gap-2 text-sm">
            {f.included ? (
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className={f.included ? "text-gray-700" : "text-gray-400"}>{f.label}</span>
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className={`block text-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${ctaClass}`}
      >
        {cta}
      </Link>
    </div>
  );
}
