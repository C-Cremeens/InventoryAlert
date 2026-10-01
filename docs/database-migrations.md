# Database migrations

Tracks #91 under roadmap #88. Committed Prisma migrations reach each environment through one composite action, `.github/actions/migrate`. Releases run it inside `.github/workflows/deploy.yml` ([deployment.md](deployment.md)); `.github/workflows/migrate.yml` runs it on its own. Each run first proves it is connected to the right Neon branch. Persistent environments only ever run `prisma migrate deploy`; never `db push`, `migrate dev` or `migrate reset`.

## What runs where

| Check                             | Where                                                                                         | What it proves                                                                                                |
| --------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Full history on a fresh database  | `ci` → "Rehearse complete migration history", `tests/migrations.test.ts`                      | Every migration applies from empty, and data survives the newest migration                                    |
| Upgrade from production           | `ci` → "Rehearse upgrade from the production release (main)" (`scripts/rehearse-upgrade.mjs`) | The schema `main` runs, with fixture data, upgrades to this commit and keeps the data                         |
| Released migrations are immutable | Same script                                                                                   | No migration that exists on `main` was edited or removed                                                      |
| Target identity                   | `.github/actions/migrate` → "Validate migration target" (`scripts/migration-target.mjs`)      | The credentials point at the expected Neon endpoint and branch, and the database's environment marker matches |

`main`'s own migration history cannot install on an empty database (`20260418200000_refactor_pricing_tiers` fails without the later-added bridge `20260418190000_prepare_tier_refactor`). The rehearsal therefore rebuilds the production schema from this commit's migrations that sort up to `main`'s newest one, which includes the bridge.

When a new migration needs the rehearsal fixtures to cover a changed table, update `scripts/upgrade-fixtures.sql`. It must only use columns that exist on `main`.

## Running a migration

Both workflows take the target only from the branch they run on:

| Branch | GitHub Environment | `APP_ENV`    |
| ------ | ------------------ | ------------ |
| `dev`  | `DEV`              | `dev`        |
| `uat`  | `UAT`              | `uat`        |
| `main` | `PROD`             | `production` |

Any other branch fails. A release migrates after CI and the build pass and before deploying. To migrate without releasing, use **Actions → Database migrations → Run workflow** and choose the branch.

Releases and migrations share one lock per environment (`release-<ENV>`). A running one is never cancelled; if several are queued, only the newest waits.

Production runs also need:

1. Approval from the `PROD` environment's required reviewer.
2. The `backup-verified` input set to `true` (on the Deploy or Database migrations dispatch), after confirming the backup/restore check in [production-release.md](production-release.md) for this release.

Each run writes a summary with the source commit, the Neon branch and a **restore point**: the database time and WAL position captured just before migrating. Neon can restore a branch to that time.

## Configuration

These extend the GitHub Environment contract in #89. Use the same names in `DEV`, `UAT` and `PROD`, with each environment's own values.

| Name                     | Type                         | Purpose                                                                                                                                                                            |
| ------------------------ | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MIGRATION_DATABASE_URL` | Environment secret           | **Direct** (non-pooler) connection string for the migration role on the target branch, with `sslmode=require`                                                                      |
| `APP_ENV`                | Environment variable         | `dev`, `uat` or `production`; must match the branch                                                                                                                                |
| `NEON_PROJECT_ID`        | Environment variable         | Shared Neon project ID                                                                                                                                                             |
| `NEON_BRANCH_ID`         | Environment variable         | Expected Neon branch ID (`br-…`)                                                                                                                                                   |
| `NEON_ENDPOINT_ID`       | Environment variable         | **New for #91.** Expected compute endpoint ID (`ep-…`, the first part of the host name, without `-pooler`)                                                                         |
| `NEON_API_KEY`           | Environment secret, optional | **New for #91.** A project-scoped Neon API key. When set, the run also asks Neon which project and branch own the endpoint. Without it, the environment marker is the branch check |

The validator stops the run if any value is missing or mismatched. It never prints the connection string; errors name the endpoint ID only.

## Environment marker

Each persistent branch carries a marker naming the environment and Neon branch it belongs to. The migration job only proceeds when the marker matches. A child branch inherits its parent's marker, but the copy names the parent's branch ID, so it is rejected until replaced.

Provision it with the branch's owner role (not the migration role), in the Neon SQL editor:

```sql
CREATE SCHEMA IF NOT EXISTS invalert_ops;
CREATE TABLE IF NOT EXISTS invalert_ops.environment_marker (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  app_env text NOT NULL CHECK (app_env IN ('dev', 'uat', 'production')),
  neon_branch_id text NOT NULL,
  provisioned_at timestamptz NOT NULL DEFAULT now()
);
-- Replace any marker copied from a parent branch.
DELETE FROM invalert_ops.environment_marker;
INSERT INTO invalert_ops.environment_marker (app_env, neon_branch_id)
VALUES ('dev', 'br-your-dev-branch-id');   -- the branch's own values

GRANT USAGE ON SCHEMA invalert_ops TO migrator;   -- your migration role
GRANT SELECT ON invalert_ops.environment_marker TO migrator;
-- The deployment smoke test (#92) reads the marker through /api/health with the runtime role.
GRANT USAGE ON SCHEMA invalert_ops TO app_runtime;
GRANT SELECT ON invalert_ops.environment_marker TO app_runtime;
```

Redo this after creating or refreshing `dev` or `uat` from another branch. Prisma does not manage the `invalert_ops` schema, so migrations never touch it.

## Roles

Use separate roles per branch:

- **Migration role** (in `MIGRATION_DATABASE_URL`): owns the `public` schema objects and can change them. Only the migration job uses it.
- **Runtime role** (the app's `DATABASE_URL` in Vercel): data access only, no schema changes.

```sql
-- As the owner, after migrations have created the tables:
GRANT USAGE ON SCHEMA public TO app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_runtime;
-- Cover tables future migrations create:
ALTER DEFAULT PRIVILEGES FOR ROLE migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_runtime;
```

Check that each branch's roles have their own passwords; a branch created from another can inherit roles.

## Writing safe migrations (expand/contract)

The old application keeps serving while a migration runs and until the new deployment is live. Every migration must work with both.

- **Expand first:** add tables, nullable columns or columns with defaults. Backfill in the same migration or in application code.
- **Contract later:** drop or rename columns, or add `NOT NULL` to existing columns, only in a later release, after no deployed code reads the old shape. That release needs explicit approval.
- To rename, add the new column, write to both, backfill, switch reads, then drop the old one in a later release.
- Never edit a migration that has reached `main`; CI rejects it. Add a new migration instead.

## When a migration fails

A failed migration stops the release, so the deploy step never runs and the previous app keeps serving.

Do not re-run blindly, and never reset a persistent database.

1. Read the failed step's log, and on the target run `npx prisma migrate status` with the migration credentials to see which migration failed.
2. Check what was applied. A failed migration can be partly applied, so compare the target's schema with the migration's statements.
3. Fix forward:
   - If nothing was applied: mark it rolled back with `npx prisma migrate resolve --rolled-back <name>`, fix the migration in a new commit (allowed only while it is not yet on `main`), and re-run.
   - If it was partly applied: write SQL to finish or undo the partial change, review it, apply it, then use `migrate resolve --applied` or `--rolled-back` to match.
4. If data was damaged, restore to a **new** Neon branch at the run's recorded restore point, compare, and copy back only what is needed. Restoring the live production branch in place is a separate, approved recovery (see #95).

## Verifying #91

Record these in #91 once `DEV` and `UAT` are configured:

- [ ] A `dev` run with `UAT` or production credentials fails at "Validate migration target" (unit tests in `tests/migration-target.test.ts` cover the same cases).
- [ ] A `dev` run with a marker copied from production fails until the marker is replaced.
- [ ] A successful `dev` run shows the source commit and restore point in its summary.
- [ ] A deliberately failing migration stops the workflow and leaves the running app untouched.
