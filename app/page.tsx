import { auth } from "@/lib/auth";
import { TIER_LIMITS } from "@/lib/tier";
import { fetchStripePrices } from "@/lib/stripe";
import type { Tier } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

type TierDisplay = {
  key: Tier;
  description: string;
  cta: string;
  highlight: boolean;
  badge?: string;
};

const PRICING_TIERS: TierDisplay[] = [
  {
    key: "FREE",
    description: "Perfect for teams getting started with low-friction restock reporting.",
    cta: "Start free",
    highlight: false,
  },
  {
    key: "PRO",
    description: "Unlimited inventory, custom label workflows, and priority support.",
    cta: "Get Pro",
    highlight: true,
    badge: "Most popular",
  },
];

const FEATURE_PILLARS = [
  {
    title: "Scan-to-alert in under 5 seconds",
    description:
      "Anyone can scan a shelf label with a native phone camera and trigger a restock signal instantly.",
  },
  {
    title: "No app downloads, no bottlenecks",
    description:
      "Your floor team, volunteers, or customers can submit low-stock alerts without creating accounts.",
  },
  {
    title: "Actionable request queue",
    description:
      "Track every incoming alert in one place, then approve, decline, and keep a clean historical record.",
  },
];

const STATS = [
  { label: "Setup time", value: "< 10 min" },
  { label: "Per-scan flow", value: "1 step" },
  { label: "Training needed", value: "0 manuals" },
];

const FAQS = [
  {
    question: "Do people need an account to submit low-stock alerts?",
    answer:
      "No. Anyone with a phone camera can scan a QR label and submit an alert immediately. Only your team needs an InventoryAlert account.",
  },
  {
    question: "Can I print labels for shelves, bins, and backroom stock?",
    answer:
      "Yes. You can generate labels for any item, then place them anywhere inventory is stored or consumed.",
  },
  {
    question: "What happens after someone scans a label?",
    answer:
      "InventoryAlert sends an email alert and logs the request in your dashboard so your team can triage and track resolution.",
  },
];

export default async function HomePage() {
  const [session, stripePrices] = await Promise.all([auth(), fetchStripePrices()]);
  if (session) redirect("/dashboard");

  const liveTierLimits = {
    ...TIER_LIMITS,
    PRO: { ...TIER_LIMITS.PRO, price: stripePrices.PRO },
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
          <p className="text-lg font-semibold tracking-tight">InventoryAlert</p>
          <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
            <Link
              href="/login"
              className="flex-1 rounded-lg border border-white/20 px-4 py-2 text-center text-sm font-medium text-slate-200 hover:border-white/40 sm:flex-none"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="flex-1 rounded-lg bg-cyan-400 px-4 py-2 text-center text-sm font-semibold text-slate-950 hover:bg-cyan-300 sm:flex-none"
            >
              Start free
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-white/10 min-h-dvh flex items-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.15),transparent_45%)]" />
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="scroll-reveal max-w-3xl">
              <p className="mb-4 inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-cyan-200">
                Reduce stockouts without adding friction
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                The fastest way to turn low inventory into action.
              </h1>
              <p className="mt-5 max-w-2xl text-base text-slate-300 sm:mt-6 sm:text-lg">
                InventoryAlert helps teams place QR labels on shelves and bins, so anyone can report
                low stock in seconds and your team gets notified instantly.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="w-full rounded-xl bg-cyan-400 px-6 py-3 text-center font-semibold text-slate-950 hover:bg-cyan-300 sm:w-auto"
                >
                  Create free workspace
                </Link>
                <Link
                  href="/login"
                  className="w-full rounded-xl border border-white/20 px-6 py-3 text-center font-semibold text-slate-100 hover:border-white/40 sm:w-auto"
                >
                  View dashboard
                </Link>
              </div>
              <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {STATS.map((stat) => (
                  <div key={stat.label} className="scroll-reveal rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-2xl font-semibold text-white">{stat.value}</p>
                    <p className="text-sm text-slate-300">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 bg-slate-900">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
            <h2 className="scroll-reveal text-3xl font-semibold tracking-tight text-white">How it works</h2>
            <p className="scroll-reveal mt-3 max-w-3xl text-slate-300">
              A clean, repeatable restock workflow that your whole team can adopt in minutes.
            </p>
            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              <HeroStep
                number={1}
                title="Create & print labels"
                description="Generate QR labels for every tracked item and place them where inventory gets used."
              />
              <HeroStep
                number={2}
                title="Let anyone scan"
                description="When stock is low, a quick scan submits a request instantly from any phone camera."
              />
              <HeroStep
                number={3}
                title="Restock with confidence"
                description="Receive email alerts and manage incoming requests in one clean workflow."
              />
            </ol>
          </div>
        </section>

        <section className="border-b border-white/10 bg-slate-950">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
            <h2 className="scroll-reveal text-3xl font-semibold tracking-tight text-white">Built for real-world operations</h2>
            <p className="scroll-reveal mt-3 max-w-3xl text-slate-300">
              Designed for busy teams that need a simple system people actually use. No heavy rollout,
              no extra app, no complex behavior change.
            </p>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {FEATURE_PILLARS.map((feature) => (
                <article
                  key={feature.title}
                  className="scroll-reveal rounded-2xl border border-white/10 bg-slate-900/70 p-5"
                >
                  <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 bg-slate-900">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
            <h2 className="scroll-reveal text-center text-3xl font-semibold tracking-tight text-white">
              Transparent pricing that scales with you
            </h2>
            <p className="scroll-reveal mx-auto mt-3 max-w-2xl text-center text-slate-300">
              Start free, grow as needed, and keep predictable costs as your operations expand.
            </p>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {PRICING_TIERS.map((tierDisplay) => {
                const tier = liveTierLimits[tierDisplay.key];
                const [price, period] = tier.price.split("/");
                const itemsText =
                  tier.maxItems === Infinity
                    ? "Unlimited inventory items"
                    : `Up to ${tier.maxItems} inventory items`;

                return (
                  <PricingCard
                    key={tierDisplay.key}
                    name={tier.label}
                    price={price}
                    period={period}
                    description={tierDisplay.description}
                    cta={tierDisplay.cta}
                    highlight={tierDisplay.highlight}
                    badge={tierDisplay.badge}
                    features={[
                      itemsText,
                      "QR label generation",
                      "Instant email alerts",
                      "Request tracking dashboard",
                      tier.scanControls
                        ? "Per-item scan timeout controls"
                        : "Per-item scan timeout controls (Pro only)",
                      tier.scanControls
                        ? "Custom QR acknowledgement copy"
                        : "Custom QR acknowledgement copy (Pro only)",
                      tier.customLabels ? "Custom labels" : "Custom labels (Pro only)",
                    ]}
                  />
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-slate-950">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
            <h2 className="scroll-reveal text-3xl font-semibold tracking-tight text-white">Frequently asked questions</h2>
            <div className="mt-8 space-y-4">
              {FAQS.map((faq) => (
                <article key={faq.question} className="scroll-reveal rounded-xl border border-white/10 bg-white/5 p-5">
                  <h3 className="font-semibold text-white">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{faq.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-slate-950">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-slate-300 sm:flex-row">
          <p>InventoryAlert · Stock alerts without workflow friction.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/register" className="hover:text-white">
              Register
            </Link>
            <Link href="/login" className="hover:text-white">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function HeroStep({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <li className="scroll-reveal rounded-2xl border border-white/10 bg-slate-900/70 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-400 font-semibold text-slate-950">
        {number}
        </div>
        <div>
          <p className="font-medium text-white">{title}</p>
          <p className="mt-1 text-sm text-slate-300">{description}</p>
        </div>
      </div>
    </li>
  );
}

function PricingCard({
  name,
  price,
  period,
  description,
  cta,
  highlight,
  features,
  badge,
}: {
  name: string;
  price: string;
  period: string;
  description: string;
  cta: string;
  highlight: boolean;
  features: string[];
  badge?: string;
}) {
  return (
    <article
      className={`relative flex h-full flex-col rounded-2xl border p-6 ${
        highlight
          ? "border-cyan-300/50 bg-cyan-300/10"
          : "border-white/10 bg-slate-950"
      } scroll-reveal`}
    >
      {badge ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-cyan-300 px-3 py-1 text-xs font-semibold text-slate-900">
          {badge}
        </span>
      ) : null}
      <div>
        <h3 className="text-lg font-semibold text-white">{name}</h3>
        <p className="mt-2 text-sm text-slate-300">{description}</p>
        <p className="mt-4 text-4xl font-semibold text-white">
          {price}
          <span className="text-base font-normal text-slate-300">/{period}</span>
        </p>
      </div>
      <ul className="mt-5 flex-1 space-y-2">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-slate-200">
            <CheckIcon />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/register"
        className={`mt-6 rounded-lg px-4 py-2.5 text-center text-sm font-semibold ${
          highlight
            ? "bg-cyan-300 text-slate-900 hover:bg-cyan-200"
            : "border border-white/20 text-slate-100 hover:border-white/40"
        }`}
      >
        {cta}
      </Link>
    </article>
  );
}

function CheckIcon(): ReactNode {
  return (
    <svg
      className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}
