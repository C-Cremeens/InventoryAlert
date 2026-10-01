# Deployment

Tracks #92 under roadmap #88. GitHub Actions (`.github/workflows/deploy.yml`) is the only thing that releases to the persistent environments. Vercel's own Git deployments are switched off for `dev`, `uat` and pull requests (see [Vercel Git deployments](#vercel-git-deployments)), so a release cannot skip CI, the migration identity check or the production approval.

## Pipeline

```
push to dev/uat ─┐
                 ├─▶ resolve ─▶ ci ─────────────────────────┐
dispatch on main ┘           └▶ verify-promotion (PROD only) ┴─▶ release (environment DEV/UAT/PROD)
```

The `release` job runs, in order:

1. **Head check**: the commit must still be the branch head, so an older candidate cannot overwrite a newer release.
2. **Validate config**: `scripts/deploy-target.mjs` checks the branch → environment mapping, `APP_ENV`, `VERCEL_TARGET`, and that `APP_BASE_URL` is https and is not the production host for dev/UAT. Any missing or mismatched value stops the run without printing secrets.
3. **Pull** the exact Vercel configuration: `--environment=production` for `main`, and `--environment=preview --git-branch=<dev|uat>` for the others. If the pulled `APP_ENV` is not the expected one, the run stops before building.
4. **Build** with `vercel build`, using the target's own settings, including `NEXT_PUBLIC_*` values. This happens **before** migrating, so a build failure never leaves a migrated database behind. A UAT build is never reused for production; `main` is rebuilt with production settings.
5. **Migrate** with `.github/actions/migrate`, the same steps as `migrate.yml` (identity check, `prisma migrate deploy`, restore point). See [database-migrations.md](database-migrations.md).
6. **Head check** again.
7. **Deploy** the prebuilt output with `APP_REVISION=<sha>`. Production deploys with `--skip-domain`, so it does not take the domain yet.
8. **Smoke test** the deployment URL with `scripts/smoke.mjs`. `/api/health` must report `ok`, `appEnv` and `dbEnv` (the database's environment marker) equal to the target, and `revision` equal to the commit.
9. **Assign the stable domain**: `vercel alias set` to the `APP_BASE_URL` host for dev/UAT, or `vercel promote` for production. This only happens after a passing smoke test.
10. **Smoke test** the stable URL.
11. **Record** in the job summary: source SHA and tree, workflow run, Vercel deployment URL, stable URL, migration result and restore point, and any hotfix override. GitHub also records a Deployment for the environment.

A failure at any step fails the run. It stops later steps, and for UAT it blocks production promotion, because production requires a *successful* UAT deployment.

### Serialization

`release` and `migrate.yml` share the concurrency group `release-<ENV>`. A running release is never cancelled. If several candidates queue up, GitHub keeps only the newest pending one. A candidate that is no longer the branch head fails its head check ("Superseded") instead of deploying.

## Environments

| Git branch | GitHub Environment | `APP_ENV` | Vercel target | Domain assignment | How a release starts |
| --- | --- | --- | --- | --- | --- |
| `dev` | `DEV` | `dev` | Preview, branch `dev` | `vercel alias set` → `APP_BASE_URL` host | Push (merge) to `dev` |
| `uat` | `UAT` | `uat` | Preview, branch `uat` | `vercel alias set` → `APP_BASE_URL` host | Push (merge) to `uat` |
| `main` | `PROD` | `production` | Production | `vercel promote` | **Actions → Deploy → Run workflow** on `main`, then PROD approval |

### Production releases

A push to `main` runs CI and the promotion check only. To release:

1. Complete the backup/restore check in [production-release.md](production-release.md).
2. **Actions → Deploy → Run workflow**, branch `main`, tick **backup-verified**.
3. Approve the `PROD` environment when prompted.

`verify-promotion` requires `main`'s tree to equal the tree of the revision UAT currently serves, meaning UAT's latest *successful* Deployment. Because it compares whole trees, it covers source, `package-lock.json` and `prisma/migrations`. Merge commits from `uat` keep the tree identical.

**Hotfixes** (`hotfix/*` → `main`) change the tree, so the check fails on the push to `main`. To release one anyway, dispatch with **hotfix** ticked as well. The override is printed as a warning and recorded in the summary, and the PROD approval still applies. Afterwards, merge `main` back into `uat` and `dev` ([branching-and-promotion.md](branching-and-promotion.md)).

## Configuration

The #89 contract applies unchanged: `MIGRATION_DATABASE_URL`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `APP_ENV`, `VERCEL_TARGET`, `NEON_PROJECT_ID`, `NEON_BRANCH_ID`, `APP_BASE_URL`, plus `NEON_ENDPOINT_ID` / `NEON_API_KEY` from #91. Use the same names in `DEV`, `UAT` and `PROD`.

`VERCEL_TARGET` must be `preview` in `DEV`/`UAT` and `production` in `PROD`. `APP_BASE_URL` must be an https origin with no path.

New for #92:

| Name | Where | Purpose |
| --- | --- | --- |
| `PRODUCTION_HOST` | Repository variable | Production host name, e.g. `app.example.com`. `PROD`'s `APP_BASE_URL` must use it; `DEV`/`UAT` never may |
| `DEPLOY_PROD_ENABLED` | Repository variable | `true` enables production releases. Leave unset until dev and UAT have been shown to work |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Environment secret, optional | Vercel's *Protection Bypass for Automation* secret, sent as `x-vercel-protection-bypass` by the smoke test when Deployment Protection is on. Never printed |

### Vercel project settings (manual)

- **`APP_ENV`** in Vercel: `production` in Production. `dev` and `uat` as Preview variables scoped to the `dev` and `uat` Git branches.
- **Runtime variables** (`DATABASE_URL` with the runtime role, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_BASE_URL` matching `APP_BASE_URL`, Stripe, Resend, Blob, VAPID, `CRON_SECRET`, Sentry) are scoped the same way. Generic Preview values, which apply to any other branch, must not hold persistent or production credentials. With previews disabled, leave them empty.
- **Database marker**: the runtime role must be able to read the environment marker, or the smoke test fails with `dbEnv: null`. See [database-migrations.md](database-migrations.md#environment-marker).
- **Domains**: attach the production domain to Production only. Add the dev and UAT hosts to the project without assigning them to a branch; the workflow aliases them after each release.
- **Deployment Protection**: keep UAT behind Vercel Authentication (or password protection) for testers, and create a *Protection Bypass for Automation* secret for the smoke test. Stripe and other provider webhooks to UAT need the bypass in their URL or an exception; record what you choose in #92.
- **Token**: `VERCEL_TOKEN` is a deployment token held only in GitHub Environments. Never add it to Vercel runtime variables.

### Vercel Git deployments

`vercel.json` does two things:

- `git.deploymentEnabled` turns off Git-triggered deployments of `dev` and `uat`.
- `ignoreCommand` skips the Vercel build of any Git push that is not to `main`, which covers PR and feature-branch previews. No preview can reach a shared database. Ephemeral Neon PR databases stay disabled until isolated, sanitized branches and cleanup exist.

The workflow deploys prebuilt output, so neither setting affects it.

`main` still deploys through Vercel Git, so the live service is untouched during setup. When enabling production releases, in one change:

1. Set `"deploymentEnabled": { "dev": false, "uat": false, "main": false }` and replace `ignoreCommand` with `"exit 0"`.
2. Promote that change to `main` and set `DEPLOY_PROD_ENABLED=true`.

## Rollout

1. Configure the settings above for `DEV`. Merge to `dev` and watch the run end to end. Check the summary, the banner on the dev URL and `/api/health`.
2. Repeat for `UAT` with a `dev → uat` promotion.
3. Record the inventory below in #92.
4. Disable Vercel Git deployments of `main` and set `DEPLOY_PROD_ENABLED=true` as described above. Do the first production release by dispatch.

## Environment inventory (record in #92, no secret values)

| | DEV | UAT | PROD |
| --- | --- | --- | --- |
| Stable URL | | | |
| Vercel project / team ID (shared) | | | |
| Vercel target and Git branch scope | preview / `dev` | preview / `uat` | production |
| Neon project ID (shared) | | | |
| Neon branch ID / endpoint ID / database | | | |
| Auth callback URLs | | | |
| Stripe mode / webhook endpoint | | | |
| Owner | | | |

## Non-production behaviour

When `APP_ENV` is `dev` or `uat`, or `VERCEL_ENV` is `preview`, every page shows a banner, carries `<meta name="robots" content="noindex, nofollow">` and is served with `X-Robots-Tag: noindex, nofollow`. Production is unaffected.

## Verifying #92

- [ ] A merge to `dev` deploys dev automatically after CI, and the summary shows SHA, deployment, migration and a passing smoke test.
- [ ] A `dev → uat` promotion deploys UAT; the UAT URL shows the banner and noindex header and requires login.
- [ ] A push to `main` does not deploy. A dispatch without `backup-verified` fails before approval. A dispatch with it waits for the PROD approval.
- [ ] A `main` tree that differs from UAT fails `verify-promotion` unless `hotfix` is ticked.
- [ ] Wrong config fails closed. Examples: `DEV`'s `APP_BASE_URL` set to the production host, `VERCEL_TARGET=production` in `UAT`, or a Vercel `dev` scope with `APP_ENV=uat`.
- [ ] Two quick merges to `dev`: the older run is replaced or stops as superseded, and the newer one deploys.
- [ ] Controlled test records created in dev are absent from UAT and production, and vice versa.
- [ ] Auth callbacks and `NEXT_PUBLIC_BASE_URL` match each environment's stable URL.
