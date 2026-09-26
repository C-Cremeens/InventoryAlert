# InventoryAlert

InventoryAlert helps teams track low-stock requests with QR codes. Staff (or customers) can scan a label, submit a request, and notify the right team quickly.

## Core Features

- QR-based low-stock reporting with no app install required.
- Item-level alert email routing and request history.
- Dashboard for triaging incoming stocking requests.
- Label generation for printable shelf/bin QR workflows.

## Plan Differences

### Free

- Up to 5 inventory items.
- Standard QR acknowledgement messaging.
- Standard 60-minute alert cooldown per item.
- Basic label generation.

### Pro

- Unlimited inventory items.
- Custom labels.
- Per-item scan timeout controls (1-1440 minutes).
- Per-item custom QR acknowledgement message.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database

Run migrations in deployment:

```bash
npm run db:migrate
```

## Production release and testing

See [the production release runbook](docs/production-release.md) for migration order,
verification requirements, notification scheduling, provider setup and recovery.

`npm run test:db` runs the full suite against a disposable local PostgreSQL-compatible
engine. CI also runs integration tests against native PostgreSQL 16. Use
`npm run audit:production` before release.
