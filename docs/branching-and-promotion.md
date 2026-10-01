# Branching and promotion

Tracks #90 under roadmap #88. Code moves `feature/*` → `dev` → `uat` → `main` (production). `main` stays the production branch; there is no separate `prod` branch.

```
feature/*, fix/* ──PR──▶ dev ──PR──▶ uat ──PR──▶ main
                           └─ release/* ─┘          ▲
                                     hotfix/* ──PR──┘ (then main ──PR──▶ uat, main ──PR──▶ dev)
```

## What CI enforces

| Workflow | Runs on | Checks |
|---|---|---|
| `ci` (`.github/workflows/ci.yml`) | PRs and pushes to `dev`, `uat`, `main` | `npm ci` from the lockfile, high/critical production audit, lint, typecheck, full migration history on a disposable PostgreSQL 16 service, unit and integration tests, production build |
| `promotion-guard` (`.github/workflows/promotion-guard.yml`) | PRs into `uat` and `main` | Source branch is allowed for the target and the candidate commit is already on the source stage (table below) |

Both workflows use `pull_request` (never `pull_request_target`), a read-only `contents: read` token, `persist-credentials: false` and no repository or environment secrets, so PR code cannot reach deployment credentials. Third-party actions are pinned to full commit SHAs with the version in a trailing comment; update both together. CI uses Node 22 (`setup-node`), matching the version the repo already built with.

### Allowed promotions

| Into | From | Additional rule |
|---|---|---|
| `uat` | `dev` | Head commit is on `dev` |
| `uat` | `release/*` | Head commit is on `dev`. Use this to freeze a candidate: cut `release/<date>` from `dev`, and later `dev` commits cannot join it |
| `uat` | `main` | Head commit is on `main` (hotfix back-propagation) |
| `main` | `uat` | Head commit is on `uat` |
| `main` | `hotfix/*` | Cut from `main`, and carries no `dev`/`uat` commits that are not already on `main` |

Everything else into `uat` or `main` fails the `promotion-guard` check. PRs into `dev` are not restricted beyond `ci`.

Use **merge commits** (not squash or rebase) for promotion PRs. The guard compares commit ancestry, and squashing creates new commits that are not on the source stage.

### Release candidates

A PR from `dev` into `uat` picks up every later push to `dev`. When UAT signoff starts, either freeze `dev` or promote through a `release/*` branch instead. Any push to the PR head re-runs both checks. Record the tested head SHA from the `uat → main` PR in #70 with the smoke-test evidence.

### Hotfixes

1. Cut `hotfix/<slug>` from `main` and open a PR into `main`. Both checks must pass.
2. After it merges, open `main → uat` and `main → dev` PRs promptly so the fix is not lost at the next promotion.

## Branch protection (manual repository setting)

These settings live in GitHub, not in the repository, and must be applied by a repository admin under **Settings → Rules → Rulesets** (or **Settings → Branches**).

Before this: create `uat` from an explicitly approved `dev` commit (`git push origin <approved-sha>:refs/heads/uat`) and record that SHA in #88.

| Setting | `dev` | `uat` | `main` |
|---|---|---|---|
| Require a pull request before merging | ✅ | ✅ | ✅ |
| Required status checks | `ci` | `ci`, `promotion-guard` | `ci`, `promotion-guard` |
| Require branches to be up to date before merging | ✅ | ✅ | ✅ |
| Block force pushes | ✅ | ✅ | ✅ |
| Restrict deletions | ✅ | ✅ | ✅ |
| Required approvals | 0 | 0 | 0 (the `PROD` GitHub Environment approval gates deployment, #92) |

A sole maintainer cannot approve their own PR on GitHub, so requiring reviews would block every merge. Production approval is handled by the `PROD` environment's required reviewer (Chris) once the deployment workflow in #92 exists; self-approval is allowed there.

A status check only appears in the required-check picker after it has run once on the repository, so open one PR into `uat` before configuring that branch.

**Plan note:** rulesets and branch protection on a private repository require GitHub Pro, Team or Enterprise. On GitHub Free they are only available for public repositories. Check the plan before relying on these settings.

### Emergency bypass

Leave the admin bypass available only for a production incident where CI itself is broken. Record who bypassed, why and the commit SHA in #70, and follow up with a normal PR that restores green CI.

## Verifying the gates (#90 acceptance)

After protection is enabled, confirm and record in #90:

- A PR into `dev` with a failing test cannot be merged.
- A PR from a `feature/*` branch into `uat` or `main` fails `promotion-guard`.
- A `dev → main` PR fails `promotion-guard`.
- A force push to `uat` is rejected.
