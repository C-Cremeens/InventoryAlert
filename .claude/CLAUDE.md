# InventoryAlert — AI Development Guide

> This file is maintained automatically by AI agents. Update it whenever you add features,
> change the tech stack, refactor structure, or discover new patterns. See the **Agent Instructions** section at the bottom.

---

## What the App Does

**InventoryAlert** is a subscription-based SaaS inventory management system. Users register inventory items, each of which receives a unique QR code that can be printed as a physical label. When a QR code is scanned, the system sends a low-stock alert email to the configured address and records a `StockingRequest` in the database. A two-tier subscription model (FREE / PRO) enforces item limits and feature access, backed by Stripe for payment processing.

**Core user flows:**
1. Register / log in (email + password)
2. Create inventory items with optional image, description, and low-stock threshold
3. Print QR code labels (3 sizes: 3"×1", 2"×1", 1"×1") with a drag-and-drop text editor — PRO only for editing/repositioning fields
4. Share QR code with staff — scanning triggers email alert + stocking request creation
5. Review and approve/decline stocking requests in the dashboard
6. Manage subscription via Stripe portal

---

## Tech Stack

| Category | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.1 |
| UI Runtime | React | 19.2.4 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS | ^4 |
| Database | PostgreSQL (via Prisma) | — |
| ORM | Prisma + @prisma/adapter-pg | ^7.5.0 |
| Authentication | NextAuth v5 (beta, Credentials) | ^5.0.0-beta.30 |
| Password Hashing | bcryptjs | ^3.0.3 |
| Validation | Zod | ^4.3.6 |
| Payments | Stripe | ^20.4.1 |
| Email | Resend | ^6.9.4 |
| File Storage | Vercel Blob | ^2.3.1 |
| QR Code | qrcode | ^1.5.4 |
| Push Notifications | web-push (VAPID) | ^3.x |

> **Note:** This project uses **Next.js 16** with the App Router — APIs, conventions, and file structure may differ from older Next.js versions. Always read `node_modules/next/dist/docs/` before writing new Next.js code.

---

## Folder Structure

```
/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Route group: unauthenticated pages
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (dashboard)/              # Route group: authenticated pages
│   │   ├── layout.tsx            # Sidebar + mobile nav layout
│   │   ├── dashboard/page.tsx
│   │   ├── items/
│   │   │   ├── page.tsx          # Item list
│   │   │   ├── new/page.tsx      # Create item form
│   │   │   └── [itemId]/         # Item detail / edit
│   │   ├── requests/page.tsx     # Stocking requests list
│   │   └── settings/page.tsx     # User settings / subscription
│   ├── api/                      # API Route Handlers
│   │   ├── auth/
│   │   │   ├── register/route.ts
│   │   │   ├── forgot-password/route.ts  # POST /api/auth/forgot-password (public)
│   │   │   ├── reset-password/route.ts   # POST /api/auth/reset-password (public)
│   │   │   └── [...nextauth]/route.ts
│   │   ├── items/
│   │   │   ├── route.ts          # GET /api/items, POST /api/items
│   │   │   └── [itemId]/route.ts # PATCH, DELETE /api/items/:id
│   │   ├── requests/
│   │   │   ├── route.ts          # GET /api/requests
│   │   │   ├── [requestId]/route.ts  # PATCH /api/requests/:id
│   │   │   └── stream/route.ts   # GET /api/requests/stream (SSE, authenticated)
│   │   ├── push/
│   │   │   ├── public-key/route.ts   # GET /api/push/public-key
│   │   │   └── subscription/route.ts # POST / DELETE /api/push/subscription
│   │   ├── scan/
│   │   │   └── [qrCodeId]/route.ts   # POST /api/scan/:qrCodeId (public)
│   │   ├── stripe/
│   │   │   ├── checkout/route.ts
│   │   │   ├── portal/route.ts
│   │   │   └── webhook/route.ts      # Public Stripe webhook
│   │   └── upload/route.ts           # POST /api/upload
│   ├── scan/
│   │   └── [qrCodeId]/page.tsx       # Public QR scan landing page
│   ├── terms/page.tsx                # Public Terms of Service page
│   ├── privacy/page.tsx              # Public Privacy Policy page
│   ├── page.tsx                      # Public marketing / landing page
│   └── layout.tsx                    # Root layout (fonts, metadata)
├── components/
│   ├── items/
│   │   ├── ItemCard.tsx
│   │   ├── ItemForm.tsx
│   │   └── QRCodeDisplay.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── MobileHeader.tsx
│   │   ├── BottomNav.tsx
│   │   └── TierBadge.tsx
│   ├── InstallBanner.tsx         # PWA install prompt (OS-aware, one-time dismissible)
│   └── print/
│       ├── LabelEditor.tsx       # Interactive drag-and-drop label canvas (PRO only)
│       └── PrintLabel.tsx        # Print-only renderer — accepts TextElement[] with % positions
├── lib/
│   ├── auth.ts                   # NextAuth config (Credentials provider, JWT)
│   ├── prisma.ts                 # Prisma client singleton
│   ├── stripe.ts                 # Stripe client
│   ├── resend.ts                 # Resend email client + sendAlertEmail() + sendPasswordResetEmail()
│   ├── push.ts                   # sendStockingPushNotification() via web-push (VAPID)
│   ├── realtime.ts               # In-memory pub/sub for SSE stocking request events
│   ├── tier.ts                   # TIER_LIMITS, canCreateItem()
│   ├── label.ts                  # LABEL_SIZES, LABEL_SIZE_CONFIG, TextElement, getDefaultTextElements()
│   └── validations/
│       ├── item.ts               # createItemSchema, updateItemSchema
│       └── request.ts            # updateRequestStatusSchema
├── prisma/
│   ├── schema.prisma             # DB schema: User, InventoryItem, StockingRequest, PushSubscription
│   └── migrations/               # Prisma migration history
├── public/
│   ├── manifest.json             # PWA manifest (required for iOS web push)
│   └── sw.js                     # Service worker: handles push events + notification clicks
├── .claude/
│   └── CLAUDE.md                 # ← This file
├── .mcp.json.example             # MCP server config template
├── next.config.ts
├── package.json
├── tsconfig.json
└── postcss.config.mjs
```

---

## Branch Strategy

```
feature/* ──┐
            ├──▶  dev  ──▶  main
fix/*   ────┘
```

- **`main`** — production-ready code only; protected branch
- **`dev`** — integration branch; all features merge here first
- **`feature/<short-description>`** — one feature/fix per branch
- **`fix/<short-description>`** — dedicated hotfix/bugfix branches
- **Agent branches** follow the pattern `<agent>/<task-slug>-<id>` (e.g. `claude/add-search-8xKj2`)

PRs must target `dev`, not `main`, unless it is a hotfix.

---

## Naming Conventions

| Artifact | Convention | Example |
|---|---|---|
| React components | PascalCase | `ItemCard.tsx`, `QRCodeDisplay.tsx` |
| Utility/lib files | camelCase | `prisma.ts`, `stripe.ts` |
| API route files | Next.js convention | `route.ts` inside directory |
| Page files | Next.js convention | `page.tsx` inside directory |
| Props interfaces | `interface Props { ... }` | `interface Props { item: InventoryItem }` |
| Validation schemas | camelCase + suffix | `createItemSchema`, `updateItemSchema` |
| DB models | PascalCase | `User`, `InventoryItem`, `StockingRequest` |
| DB enums | UPPER_CASE | `Tier.FREE`, `RequestStatus.PENDING` |
| DB fields | camelCase | `stripeCustomerId`, `qrCodeId` |
| Constants | UPPER_SNAKE_CASE | `TIER_LIMITS`, `LABEL_SIZES`, `MAX_SIZE` |
| Environment vars | UPPER_SNAKE_CASE | `NEXTAUTH_SECRET`, `RESEND_API_KEY` |
| Public env vars | `NEXT_PUBLIC_` prefix | `NEXT_PUBLIC_BASE_URL` |

---

## API & Component Patterns

### API Route Handlers

```ts
// app/api/<resource>/route.ts
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... fetch from Prisma
  return NextResponse.json(data);
}
```

- Auth check via `auth()` from `lib/auth.ts` (NextAuth v5)
- Validate request bodies with Zod `.safeParse()`:
  ```ts
  const result = schema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
  ```
- Return `{ error: string }` with appropriate HTTP status on failure
- Public routes (scan, webhook): no auth check; Stripe webhook verifies signature manually

### Server Components

```tsx
// app/(dashboard)/items/page.tsx
export default async function ItemsPage() {
  const session = await auth();
  const items = await prisma.inventoryItem.findMany({ where: { userId: session.user.id } });
  return <ItemList items={items} />;
}
```

### Client Components

```tsx
"use client";
export default function ItemForm({ item }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  // fetch to /api/items, router.refresh() after mutation
}
```

- Client components are marked with `"use client"` at top of file
- Mutations call `fetch('/api/...')` then `router.refresh()` to re-render server data

### Tier Enforcement

```ts
import { canCreateItem, TIER_LIMITS } from "@/lib/tier";
const allowed = canCreateItem(session.user.tier, currentCount);
if (!allowed) return NextResponse.json({ error: "Upgrade required" }, { status: 403 });
```

### Email Alerts

```ts
import { sendAlertEmail } from "@/lib/resend";
// Rate-limited: 1 email per item per hour (checked via StockingRequest.emailSent + createdAt)
await sendAlertEmail({ itemName, alertEmail });
```

---

## Database Schema Summary

```
User            — id, email, hashedPassword, name, tier, stripeCustomerId, stripeSubscriptionId,
                  termsAcceptedAt, termsVersion
InventoryItem   — id, name, description, imageUrl, alertEmail, qrCodeId (UUID), userId, lowStockThreshold
                  + future fields: externalCartLink, externalPlatform, externalApiKeyRef
StockingRequest — id, itemId, status (PENDING/APPROVED/DECLINED), emailSent, createdAt
```

Cascade deletes: `User → InventoryItem → StockingRequest`

---

## Testing Instructions

> **Known gap: No tests exist in this codebase.**

There is no test runner, no test directory, and no Jest/Vitest configuration. This is a known gap.

**When adding tests:**
1. Add Vitest (recommended for Next.js App Router) or Jest with `jest-environment-jsdom`
2. Place unit tests alongside source files as `*.test.ts` or in a top-level `__tests__/` directory
3. Integration tests for API routes can use `@testing-library/react` + MSW for API mocking
4. Add a `test` script to `package.json`: `"test": "vitest run"`

**Priority areas to test first:**
- `lib/tier.ts` — `canCreateItem()` pure function (easy wins)
- `lib/validations/` — Zod schema validation edge cases
- `/api/scan/[qrCodeId]` — rate limiting logic
- `/api/auth/register` — validation and duplicate email handling

---

---

## Known Gaps & TODOs

| # | Area | Description | Priority |
|---|---|---|---|
| 1 | Testing | No tests exist — no test runner configured | High |
| 3 | Third-party cart integration | Schema fields exist (`externalCartLink`, `externalPlatform`, `externalApiKeyRef`) but feature not implemented | Medium |
| 7 | Request notifications | No real-time notifications for new stocking requests (polling or websocket) | Low |

---

## Agent Instructions

### Working with GitHub Issues

- **Finding work:** When looking for issues to work on, filter by the `ready` label (`mcp__github__list_issues` with `labels: ["ready"]`).
- **Starting work:** As soon as the user confirms they want to start working on an issue (before writing any code):
  1. Remove the `ready` label from the issue (`mcp__github__issue_write` with `method: "update"`, removing `ready` from labels).
  2. Move the issue to **In Progress** on the project board using the GraphQL `updateProjectV2ItemFieldValue` mutation — project ID `PVT_kwHOBy3B684BTqg_`, field ID `PVTSSF_lAHOBy3B684BTqg_zhA3-wY`, option ID `b8f3c062`.
  3. Only then proceed with planning and coding.

### Keeping CLAUDE.md Up to Date

When making code changes, update this file if any of the following change:

1. **New dependency added** → update the Tech Stack table
2. **New folder or route added** → update the Folder Structure section
3. **New API endpoint** → add it under API & Component Patterns
4. **New naming convention observed** → add a row to the Naming Conventions table
5. **Known gap resolved** → remove it from the Known Gaps table
6. **New known gap or TODO discovered** → add it to the Known Gaps table
7. **Branch strategy changes** → update Branch Strategy

Commit CLAUDE.md changes in the same commit as the code changes that prompted them.
