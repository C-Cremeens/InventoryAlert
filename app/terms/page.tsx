import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — InventoryAlert",
};

const EFFECTIVE_DATE = "April 18, 2026";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-semibold tracking-tight hover:text-cyan-300 transition-colors">
            InventoryAlert
          </Link>
          <div className="flex gap-3 text-sm text-slate-400">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/login" className="hover:text-white transition-colors">Sign in</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Terms of Service</h1>
        <p className="mt-2 text-sm text-slate-400">Effective date: {EFFECTIVE_DATE}</p>

        <div className="mt-10 space-y-10 text-slate-300 leading-7">

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Service Description</h2>
            <p>
              InventoryAlert (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;the Service&rdquo;) provides a QR-code-based
              inventory alert platform. Users create inventory items, generate printable QR labels, and receive
              email notifications when a label is scanned to report low stock. The Service also maintains a
              stocking-request queue for review and approval by the account holder.
            </p>
            <p className="mt-3">
              The Service does <strong className="text-white">not</strong> physically manage, store, or purchase
              inventory on your behalf. It is a notification and record-keeping tool only.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Account &amp; Security</h2>
            <p>
              You must provide a valid email address and a password of at least 8 characters to create an
              account. You are responsible for maintaining the confidentiality of your credentials and for all
              activity that occurs under your account. You may not share your account with others or create
              accounts on behalf of another person without their consent. Notify us immediately if you suspect
              unauthorized use.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Subscription Tiers</h2>
            <p>The Service offers two tiers:</p>
            <ul className="mt-3 space-y-2 list-disc list-inside">
              <li>
                <strong className="text-white">FREE</strong> — Up to 5 inventory items; standard QR label
                generation; email alert delivery; access to the stocking-request dashboard.
              </li>
              <li>
                <strong className="text-white">PRO</strong> — Unlimited inventory items; all FREE features;
                custom drag-and-drop label editor with repositionable fields.
              </li>
            </ul>
            <p className="mt-3">
              Feature availability may change over time. We will give reasonable notice before removing
              features from a tier you are currently using.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Billing &amp; Auto-Renewal</h2>
            <p>
              PRO subscriptions are billed on a recurring monthly basis via Stripe. Your subscription
              auto-renews at the end of each billing period unless you cancel before the renewal date.
              Prices are displayed at checkout and on our pricing page. We reserve the right to change
              pricing with at least 30 days&rsquo; notice to your registered email address.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Cancellation &amp; Refunds</h2>
            <p>
              You may cancel your PRO subscription at any time via the billing portal in your account
              settings. Upon cancellation, your subscription remains active until the end of the current
              paid billing period; you will not be charged again after that. We do not issue prorated
              refunds for unused time in a billing period. If you believe a charge was made in error,
              contact us within 30 days of the charge.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Acceptable Use</h2>
            <p>You agree not to use the Service to:</p>
            <ul className="mt-3 space-y-2 list-disc list-inside">
              <li>Generate, distribute, or use QR codes for spam, phishing, fraud, or deceptive purposes.</li>
              <li>Circumvent access controls of any system or third-party service.</li>
              <li>Scrape, crawl, or programmatically extract data from the Service beyond normal API use.</li>
              <li>Upload content that infringes intellectual property rights or contains malware.</li>
              <li>Transmit unsolicited bulk email using alert email addresses obtained through the Service.</li>
              <li>Violate any applicable law or regulation.</li>
            </ul>
            <p className="mt-3">
              We reserve the right to suspend or terminate accounts that violate this policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Email Alerts Sent on Your Behalf</h2>
            <p>
              When a QR code is scanned, the Service sends an alert email to the address you configured for
              that item. These emails are sent from InventoryAlert&rsquo;s sending infrastructure (powered by
              Resend). You are responsible for ensuring that the configured alert email address is correct and
              that you have consent to send alerts there. We are not liable if an alert email fails to
              deliver due to recipient-side filtering, Resend infrastructure issues, or incorrect
              configuration.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. No Uptime Guarantee</h2>
            <p>
              The Service is provided &ldquo;as is&rdquo; without any warranty of availability or uptime. We make
              commercially reasonable efforts to maintain service availability but do not guarantee
              uninterrupted access. Scheduled or emergency maintenance may occur without advance notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, Petra 413 LLC and its officers shall not be liable
              for any indirect, incidental, special, or consequential damages arising from your use of the
              Service, including but not limited to:
            </p>
            <ul className="mt-3 space-y-2 list-disc list-inside">
              <li>Losses caused by a missed, delayed, or undelivered alert email.</li>
              <li>Stock-out events, lost sales, or operational disruptions attributable to the Service.</li>
              <li>Data loss resulting from account deletion or service interruption.</li>
            </ul>
            <p className="mt-3">
              Our total cumulative liability to you for any claim arising out of these Terms shall not exceed
              the fees you paid to us in the three months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Third-Party Services</h2>
            <p>
              The Service relies on the following third parties whose own terms and policies apply to their
              respective services:
            </p>
            <ul className="mt-3 space-y-2 list-disc list-inside">
              <li><strong className="text-white">Stripe</strong> — payment processing and subscription management.</li>
              <li><strong className="text-white">Resend</strong> — transactional email delivery.</li>
              <li><strong className="text-white">Vercel</strong> — hosting and file (image) storage.</li>
            </ul>
            <p className="mt-3">
              We are not responsible for the availability or conduct of these third-party services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">11. Data on Account Deletion</h2>
            <p>
              When you delete your account, all associated data is permanently removed, including inventory
              items, QR codes, stocking requests, uploaded images, and push notification subscriptions.
              This action is irreversible. Export any data you need before deleting your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">12. Termination by Us</h2>
            <p>
              We may suspend or terminate your account at our discretion if we believe you have violated
              these Terms, engaged in fraudulent activity, or posed a risk to other users or to the Service.
              Where reasonably practicable, we will notify you before termination and give you an opportunity
              to respond. Upon termination, your right to use the Service ceases immediately.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">13. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify you of material changes by email
              at least 14 days before they take effect. Continued use of the Service after the effective
              date constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">14. Governing Law</h2>
            <p>
              These Terms are governed by and construed in accordance with applicable law. Any disputes
              shall be resolved in the courts of the jurisdiction where Petra 413 LLC operates.{" "}
              <span className="text-slate-500 italic">[Jurisdiction to be specified before going live.]</span>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">15. Contact</h2>
            <p>
              Questions about these Terms?{" "}
              <span className="text-slate-500 italic">[Insert contact email before going live.]</span>
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t border-white/10 mt-16">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-slate-400 sm:flex-row">
          <p>InventoryAlert · Stock alerts without workflow friction.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/login" className="hover:text-white transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
