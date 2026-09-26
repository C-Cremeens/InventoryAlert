# InventoryAlert production release

This branch implements issues #80–#85 and the code portions of #52, #53, #64 and #68. Issue #70 remains the release tracker. Do not mark the production gates below complete from a passing build alone.

## Customer-visible changes

- Opening a QR URL only shows the item. Press **Report low stock** to create a report. Existing printed QR URLs continue to work.
- Repeated submissions share a report during the cooldown. Free accounts use 60 minutes; Pro accounts use their configured timeout. Request history no longer fills with duplicates. "Queued" means persisted for sending, not inbox delivery.
- Credentials accounts verify mailbox ownership by following a recovery/verification link and choosing their password. This deliberately replaces any password chosen by a pre-registrant. All pre-release login cookies become invalid; customers sign in again.
- Google linking to an unverified existing account redirects to mailbox recovery, rather than preserving an untrusted password. The migration removes existing passwords from Google-linked accounts because the old flow could have retained a pre-registrant's password. Google access and inventory remain intact; owners can use Forgot password to establish a new password.
- Existing credentials accounts and third-party alert recipients are **not** automatically considered verified. Verify owners and confirm recipients in Settings before relying on alerts. An owner's verified email is automatically eligible.
- Google-created accounts accept Terms before using the app. Settings includes recipient confirmation controls.
- Downgrades preserve inventory and configuration. Free accounts cannot create beyond five items, edit Pro settings, or use saved custom label layouts. Scans use the standard cooldown/acknowledgement and the first configured, enabled recipient only. Existing items continue to accept reports.
- Notifications are retried automatically up to five attempts within 20 hours. The request list shows failed notifications for manual follow-up. Email "accepted" is not a guarantee of inbox delivery; inspect Resend for delivery/bounce status.

## Validation commands

```sh
npm ci
npm run audit:production
npm run lint
npx tsc --noEmit
npm run test:db
npm run build
```

`test:db` starts a disposable in-memory PGlite TCP database, applies the complete migration history through Prisma, and exercises API/database flows. PGlite multiplexes connections differently from native PostgreSQL. CI separately runs the same integration tests against PostgreSQL 16 to validate actual row locks and concurrent transactions. Never point tests at a customer database. The integration suite only accepts a localhost/CI `*_test` URL.

The scoped dependency overrides for `@prisma/config` → `deepmerge-ts` and `prisma` → `mysql2` address advisories without downgrading the Prisma major version. Prisma is development/deployment tooling; client and adapter remain runtime dependencies. The full migration rehearsal verifies compatibility of these overrides. Reassess/remove them when upstream Prisma ships fixed dependencies.

## Migration rehearsal and promotion

1. Require CI on the PR targeting `dev`. Merge and deploy to an isolated preview with a separate database, Blob store, Stripe test account configuration and mail test recipients.
2. Take a database backup. Restore it into a disposable database and verify real item/request counts. Record recovery duration and the snapshot identifier in #70.
3. On the restored copy, run `npm run db:migrate` from the release commit and `npx prisma migrate status`. Check owner login, old QR labels, recipient mappings and billing status.
4. Two new migrations must be applied: `20260418190000_prepare_tier_refactor` is a compatibility bridge that sorts before the historical tier refactor. It fixes fresh-database installation without changing any already-applied migration file. On databases already using FREE/PRO it does not change the default. `20260926163000_production_hardening` adds delivery jobs, image ownership, recipient consent, session/checkout fields and processed webhook events, and clears legacy Google-linked passwords.
5. If a prior fresh install has a failed historical pricing migration recorded, discard/recreate that **disposable** database or inspect its state and use Prisma's documented migration recovery process. Do not reset a production database.
6. Production promotion is a distinct release action. Apply migrations in a protected release step before directing traffic to the new code. Do not run migrations automatically against production from every preview build.
7. Confirm the production deployment uses the approved commit on `main`. Record commit/deployment IDs and smoke-test results in #70.

Rollback: prefer a forward fix. New tables/columns are additive, but reverting the code reintroduces the security defects and the old scan behavior. The password cleanup cannot be undone safely by restoring untrusted password hashes. For disaster recovery, stop traffic/workers, restore the approved snapshot, reconcile Stripe/Resend events, then deploy a reviewed compatible release. Do not drop tables or blindly revert database migrations while traffic is running.

## Production configuration gates (not yet verified)

- Required environment: database, a fresh 32+ character auth secret, HTTPS `NEXT_PUBLIC_BASE_URL`, Resend credentials/from address, and a fresh 32+ character `CRON_SECRET`. Stripe/Google/push groups must be complete when enabled. Avoid different base URLs for labels and checkout.
- Set `BLOB_PUBLIC_HOSTNAME` to the exact existing public Blob store hostname to adopt legitimate pre-migration owner-path uploads. New uploads are tracked automatically. Never use an arbitrary customer's URL to delete an image. Existing images that cannot be verified stay displayed but cannot be reassigned/deleted through the cleanup helper until inspected.
- Enable the notification worker every five minutes and image/rate-limit maintenance daily. `vercel.json` supplies only the daily maintenance schedule so previews remain compatible with Hobby limits. The five-minute retry worker requires an external scheduler (the disabled-by-default GitHub workflow is included) or Vercel Pro. An external scheduler may call the same endpoints with `Authorization: Bearer <CRON_SECRET>`. Do not expose this secret in client code. Vercel Cron runs on production, so test the authenticated endpoints manually in an isolated preview. Verify retry backlog drains after stopping/restarting a worker.
- Stripe live keys, expected price/product and webhook secret; subscribe to checkout completion/async payment success/failure, subscription created/updated/deleted, invoice paid/payment failed. Billing portal and terms URLs must be configured in Stripe. Legacy Stripe customers must have `User.stripeCustomerId` mapped; unknown customer events fail for investigation rather than silently disappearing.
- Resend sender domain DNS and deliverability; recipient confirmation and password recovery emails must work. Confirm the recorded provider ID exists. Test rejection and bouncing with provider-supported test addresses.
- Production VAPID keys and subject; real iPhone PWA and Android notification permission tests, including revoking permission and switching accounts on a shared phone.
- Optional `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`; provision the project, configure alert recipients and deliberately generate a controlled preview error to verify reporting. Request headers, bodies, cookies, query parameters and user fields are disabled/redacted. Source-map upload is not configured; server stack traces remain available.
- Configure an external uptime monitor for `/api/health` and alert on failure. Configure error alerts for delivery retry exhaustion and failed Stripe reconciliation. Inspect the oldest pending/processing job age; a healthy database endpoint alone does not prove workers are running.
- Branch protection and backups/restore are hosting/account settings and still need verification.

## Customer support: export and deletion

Until an owner-facing export/delete flow is shipped, handle requests through the configured support address. Verify account ownership using the same verified account address; never accept an unverified caller's account ID alone.

Export: scope every query to `User.id`; include inventory, configured recipients/contacts, request history, subscription status and uploaded images. Exclude password hashes, reset/consent tokens, push keys and infrastructure secrets. Deliver through an authenticated expiring channel. Do not attach another customer's shared infrastructure records.

Deletion procedure:

1. Verify the request and export first if requested. Record the support action without retaining unnecessary personal data.
2. Increment the user's session version and disable outbound alerts; stop queued jobs for that owner. Revoke push subscriptions.
3. Cancel the correct Stripe subscription and verify no further renewals; follow the agreed refund/retention policy. Do not delete a Stripe customer before reconciling billing.
4. Collect tracked/verified owner Blob URLs before deleting the database user. Remove item references, then delete only owned/unreferenced images. Retry failed Blob cleanup before finalizing deletion. Inspect legacy uploads separately using the configured store/owner path; do not trust arbitrary image URLs.
5. Delete the User; relational cascades remove inventory, contacts, requests, notification jobs, consents and identities. Verify no owned Blob files or pending outbound jobs remain. Review processor logs and backup-retention policy before promising complete erasure.
6. Confirm completion to the verified requester and retain only required support/billing audit evidence.

No account deletion, billing changes or customer data export has been performed by this implementation.

## Acceptance test with a pilot customer

- Register, receive verification, set password, sign in; verify old sessions stop working after recovery.
- Sign in with Google; accept Terms; test an existing unverified email without granting access to its old password.
- Create an item, upload a real image, set a recipient, confirm it and print each label size.
- Scan printed labels on iOS and Android, press Report, refresh and retry after a network interruption. Expect one request during cooldown and accurate queued/disabled/failure messages.
- Verify inbox delivery and push; reject delivery in a test environment and observe retries without duplicate email.
- Confirm Free limits, upgrade without signing out, payment failure, recovery, cancellation and downgrade. Repeat checkout and replay webhook events in Stripe test mode.
- Check history pagination, approve/decline, and rejected cross-account access.
- Test the worker with its scheduler disabled, then re-enabled; verify backlog recovery and error alerts.
- Confirm support contact, account export/deletion procedure and backup restore.

Organization membership/roles, additional OAuth providers and third-party shopping carts remain separate product work; this release keeps inventory owned by one account.


### Five-minute worker without a Vercel plan change

`.github/workflows/notification-worker.yml` is disabled until repository variable
`INVALERT_WORKER_ENABLED` is set to `true`. Before enabling it on the default branch,
set repository secrets `INVALERT_BASE_URL` (the HTTPS production origin) and
`INVALERT_CRON_SECRET` (matching the app's `CRON_SECRET`). A manual run is available
for controlled verification. GitHub scheduled runs can be delayed; monitor job age
and use a scheduler with a stronger delivery guarantee if the pilot requires one.
For Vercel Pro, instead add the five-minute notifications entry from
`docs/vercel-pro-cron.example.json` to the deployment configuration. Do not run two
schedulers deliberately; database leases protect accidental overlap.

The initial PR preview rejected a five-minute Vercel cron due to the current plan's
frequency limit. The app does not require upgrading the hosting plan to build/deploy.
Reliable automated retries remain a launch gate until one scheduler is verified.
