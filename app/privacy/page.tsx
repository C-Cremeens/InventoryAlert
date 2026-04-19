import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — InventoryAlert",
};

const EFFECTIVE_DATE = "April 18, 2026";
const CONTACT_EMAIL = process.env.LEGAL_CONTACT_EMAIL ?? "chris.cremeens@petra413.com";
const COMPANY_ADDRESS = process.env.LEGAL_COMPANY_ADDRESS ?? "1586 Spruce Dr., Arkdale WI 54613";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-semibold tracking-tight hover:text-cyan-300 transition-colors">
            InventoryAlert
          </Link>
          <div className="flex gap-3 text-sm text-slate-400">
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/login" className="hover:text-white transition-colors">Sign in</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-400">Effective date: {EFFECTIVE_DATE}</p>

        <div className="mt-10 space-y-10 text-slate-300 leading-7">

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Who We Are</h2>
            <p>
              InventoryAlert is operated by Petra 413 LLC ({COMPANY_ADDRESS}). This Privacy Policy
              explains what personal data we collect, how we use it, and your rights regarding that data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Data We Collect</h2>
            <p>We collect the following categories of data when you use InventoryAlert:</p>
            <ul className="mt-3 space-y-2 list-disc list-inside">
              <li>
                <strong className="text-white">Account data</strong> — your name (optional), email address,
                and hashed password.
              </li>
              <li>
                <strong className="text-white">Inventory data</strong> — item names, descriptions, alert
                email addresses, low-stock thresholds, and item images you upload.
              </li>
              <li>
                <strong className="text-white">Stocking requests</strong> — timestamps and status records
                created when a QR code is scanned.
              </li>
              <li>
                <strong className="text-white">Subscription data</strong> — Stripe customer ID and
                subscription ID used to manage your billing relationship.
              </li>
              <li>
                <strong className="text-white">Push notification subscriptions</strong> — browser endpoint
                and encryption keys if you opt in to browser push notifications.
              </li>
              <li>
                <strong className="text-white">Terms acceptance record</strong> — the timestamp and version
                of the Terms of Service you accepted at registration.
              </li>
              <li>
                <strong className="text-white">Password reset tokens</strong> — temporary tokens used
                to verify password reset requests; these expire after a short window.
              </li>
            </ul>
            <p className="mt-3">
              We do <strong className="text-white">not</strong> collect payment card details. Card processing
              is handled entirely by Stripe; we never see or store raw card numbers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. How We Use Your Data</h2>
            <ul className="mt-3 space-y-2 list-disc list-inside">
              <li>To authenticate you and operate your account.</li>
              <li>
                To send low-stock alert emails to the address you configure for each inventory item.
              </li>
              <li>To process and manage your subscription payments via Stripe.</li>
              <li>
                To send transactional emails such as password resets. We do not send marketing emails
                unless you explicitly opt in.
              </li>
              <li>
                To deliver browser push notifications about new stocking requests if you have opted in.
              </li>
              <li>To comply with legal obligations and enforce our Terms of Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Third-Party Data Processors</h2>
            <p>
              We share data with the following sub-processors, each of which operates under its own
              privacy policy:
            </p>
            <ul className="mt-3 space-y-2 list-disc list-inside">
              <li>
                <strong className="text-white">Stripe</strong> — processes payment data for PRO
                subscriptions. Your billing information is governed by Stripe&rsquo;s Privacy Policy.
              </li>
              <li>
                <strong className="text-white">Resend</strong> — delivers transactional emails (alert
                notifications, password resets). Email content and recipient addresses are transmitted
                to Resend for delivery.
              </li>
              <li>
                <strong className="text-white">Vercel</strong> — hosts the application and stores
                item images you upload (via Vercel Blob). Data is stored on Vercel&rsquo;s infrastructure.
              </li>
            </ul>
            <p className="mt-3">
              We do not sell your personal data to any third party.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Data Storage &amp; Retention</h2>
            <p>
              Your data is stored in a PostgreSQL database hosted on Vercel&rsquo;s infrastructure. Uploaded
              item images are stored in Vercel Blob. Data is retained for as long as your account is
              active. When you delete your account, all associated data — including inventory items,
              stocking requests, images, and push subscriptions — is permanently and irreversibly deleted.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Cookies &amp; Sessions</h2>
            <p>
              We use a single session cookie managed by NextAuth to keep you signed in. This is a
              strictly necessary, HTTP-only cookie. We do not use advertising cookies, tracking pixels,
              or third-party analytics cookies. No third-party tracking scripts are loaded on any page.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. QR Code Scans &amp; Public Access</h2>
            <p>
              Anyone who scans one of your QR labels can trigger a stocking request without creating an
              account. The only data recorded at scan time is the item ID and the timestamp. No personal
              data about the scanner is collected or stored.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Your Rights</h2>
            <p>
              Depending on your jurisdiction, you may have the right to access, correct, or delete your
              personal data, to restrict or object to processing, or to data portability. To exercise any
              of these rights, contact us at the email below. We will respond within 30 days.
            </p>
            <p className="mt-3">
              If you are in the European Economic Area, you have the right to lodge a complaint with your
              local data protection authority.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Children</h2>
            <p>
              InventoryAlert is not directed at children under the age of 16. We do not knowingly collect
              personal data from anyone under 16. If you believe a minor has created an account, please
              contact us and we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Material changes will be communicated
              by email at least 14 days before they take effect. The effective date at the top of this
              page reflects the most recent version.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">11. Contact</h2>
            <p>
              For privacy-related questions or data requests, email{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-cyan-300 hover:underline">{CONTACT_EMAIL}</a>.
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
