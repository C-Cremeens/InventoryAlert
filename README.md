# InventoryAlert

A subscription-based SaaS inventory management system. Register inventory items, print QR code labels, and receive low-stock alert emails whenever a label is scanned.

## Features

- Create inventory items with images, descriptions, and custom low-stock thresholds
- Generate and print QR code labels in three sizes (3"×1", 2"×1", 1"×1") with a drag-and-drop text editor
- Scan a QR code → low-stock alert email sent to the configured address + stocking request recorded
- Review and approve/decline stocking requests in a dashboard
- Tiered subscriptions (FREE / FAMILY / ENTERPRISE) enforced via Stripe
- Direct reorder links on the scan page via external cart integration (Amazon, Walmart, Shopify, or custom)

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- [Stripe account](https://dashboard.stripe.com/) with two products created (FAMILY and ENTERPRISE)
- [Resend account](https://resend.com/) with a verified sending domain

## Environment Setup

Copy `.env.example` to `.env.local` and fill in each value:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Random 32-char string (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Base URL of the app (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_BASE_URL` | Same as `NEXTAUTH_URL` — used for QR code URLs |
| `RESEND_API_KEY` | Resend API key from [resend.com/api-keys](https://resend.com/api-keys) |
| `RESEND_FROM_EMAIL` | Verified sender address in your Resend account |
| `STRIPE_SECRET_KEY` | Secret key from [Stripe dashboard](https://dashboard.stripe.com/apikeys) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Publishable key from Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (see Stripe webhook setup below) |
| `STRIPE_PRICE_FAMILY` | Price ID for the FAMILY plan |
| `STRIPE_PRICE_ENTERPRISE` | Price ID for the ENTERPRISE plan |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for image uploads |

### Stripe Webhook Setup

1. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and run `stripe listen --forward-to localhost:3000/api/stripe/webhook`
2. Copy the webhook signing secret printed by the CLI into `STRIPE_WEBHOOK_SECRET`
3. In production, create a webhook endpoint in the Stripe dashboard pointing to `https://yourdomain.com/api/stripe/webhook` with events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`

## Quick Start

```bash
# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run db:migrate` | Apply pending Prisma migrations |
| `npm run db:studio` | Open Prisma Studio (database browser) |

## Tech Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL · Prisma · NextAuth v5 · Stripe · Resend · Vercel Blob
