// Validates that a migration job is pointed at the database its Git branch maps to (#91).
// Fails closed: any missing or mismatched value blocks the migration. Never prints credentials.
// See docs/database-migrations.md.
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import pg from "pg";

export const BRANCH_TARGETS = {
  dev: { environment: "DEV", appEnv: "dev" },
  uat: { environment: "UAT", appEnv: "uat" },
  main: { environment: "PROD", appEnv: "production" },
};

const REQUIRED = [
  "APP_ENV",
  "NEON_PROJECT_ID",
  "NEON_BRANCH_ID",
  "NEON_ENDPOINT_ID",
  "MIGRATION_DATABASE_URL",
];

// Checks that need no network access. Returns a list of errors; empty means valid.
export function checkConfig(env) {
  const errors = [];
  const target = BRANCH_TARGETS[env.GIT_REF_NAME];
  if (!target)
    return [
      `Branch "${env.GIT_REF_NAME}" has no migration target. Allowed: dev, uat, main.`,
    ];
  for (const name of REQUIRED)
    if (!env[name]) errors.push(`${name} is not set.`);
  if (errors.length) return errors;

  if (env.APP_ENV !== target.appEnv)
    errors.push(
      `APP_ENV is "${env.APP_ENV}" but branch ${env.GIT_REF_NAME} must target "${target.appEnv}".`,
    );

  let url;
  try {
    url = new URL(env.MIGRATION_DATABASE_URL);
  } catch {
    return [...errors, "MIGRATION_DATABASE_URL is not a valid URL."];
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    errors.push(
      "MIGRATION_DATABASE_URL must be a postgres:// or postgresql:// URL.",
    );
  const endpoint = url.hostname.split(".")[0];
  if (endpoint.endsWith("-pooler"))
    errors.push(
      "MIGRATION_DATABASE_URL uses the Neon pooler. Migrations need the direct (non-pooler) endpoint.",
    );
  else if (endpoint !== env.NEON_ENDPOINT_ID)
    errors.push(
      `MIGRATION_DATABASE_URL points at endpoint "${endpoint}", expected "${env.NEON_ENDPOINT_ID}".`,
    );
  if (
    !["require", "verify-ca", "verify-full"].includes(
      url.searchParams.get("sslmode") ?? "",
    )
  )
    errors.push(
      "MIGRATION_DATABASE_URL must set sslmode=require (or verify-ca/verify-full).",
    );
  return errors;
}

// Compares the environment marker stored in the target database with the expected identity.
export function checkMarker(env, marker) {
  if (!marker)
    return [
      "The target database has no environment marker. Provision it before migrating (docs/database-migrations.md).",
    ];
  const errors = [];
  if (marker.app_env !== env.APP_ENV)
    errors.push(
      `The target database is marked "${marker.app_env}", not "${env.APP_ENV}".`,
    );
  if (marker.neon_branch_id !== env.NEON_BRANCH_ID)
    errors.push(
      `The environment marker names Neon branch "${marker.neon_branch_id}", expected "${env.NEON_BRANCH_ID}". ` +
        "A marker copied from a parent branch must be replaced.",
    );
  return errors;
}

// Optional: confirms with the Neon API that the endpoint belongs to the expected project and branch.
export function checkNeonEndpoint(env, endpoint) {
  const errors = [];
  if (endpoint?.project_id !== env.NEON_PROJECT_ID)
    errors.push(
      `Neon reports endpoint ${env.NEON_ENDPOINT_ID} in project "${endpoint?.project_id}", expected "${env.NEON_PROJECT_ID}".`,
    );
  if (endpoint?.branch_id !== env.NEON_BRANCH_ID)
    errors.push(
      `Neon reports endpoint ${env.NEON_ENDPOINT_ID} on branch "${endpoint?.branch_id}", expected "${env.NEON_BRANCH_ID}".`,
    );
  return errors;
}

export async function readTarget(url) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const marker = await client
      .query(
        `SELECT app_env, neon_branch_id FROM invalert_ops.environment_marker WHERE singleton`,
      )
      .then(
        (r) => r.rows[0],
        (e) => {
          if (e.code === "42P01" || e.code === "3F000") return undefined; // table or schema missing
          throw e;
        },
      );
    const point = (
      await client.query(
        `SELECT now() AS at, pg_current_wal_lsn()::text AS lsn`,
      )
    ).rows[0];
    return {
      marker,
      restorePoint: { at: point.at.toISOString(), lsn: point.lsn },
    };
  } finally {
    await client.end();
  }
}

async function fetchNeonEndpoint(env) {
  const res = await fetch(
    `https://console.neon.tech/api/v2/projects/${encodeURIComponent(env.NEON_PROJECT_ID)}/endpoints/${encodeURIComponent(env.NEON_ENDPOINT_ID)}`,
    {
      headers: {
        Authorization: `Bearer ${env.NEON_API_KEY}`,
        Accept: "application/json",
      },
    },
  );
  if (!res.ok)
    throw new Error(
      `Neon API returned HTTP ${res.status} for the endpoint lookup.`,
    );
  return (await res.json()).endpoint;
}

export async function main(env = process.env) {
  const fail = (errors) => {
    for (const e of errors) console.log(`::error::${e}`);
    process.exitCode = 1;
  };
  const configErrors = checkConfig(env);
  if (configErrors.length) return fail(configErrors);

  if (env.NEON_API_KEY) {
    let endpoint;
    try {
      endpoint = await fetchNeonEndpoint(env);
    } catch (e) {
      return fail([`Neon API check failed: ${e.message}`]);
    }
    const apiErrors = checkNeonEndpoint(env, endpoint);
    if (apiErrors.length) return fail(apiErrors);
  } else {
    console.log(
      "::notice::NEON_API_KEY not set; skipping the Neon API branch check. The environment marker still applies.",
    );
  }

  let target;
  try {
    target = await readTarget(env.MIGRATION_DATABASE_URL);
  } catch (e) {
    // pg errors do not include the password; keep only code and message.
    return fail([
      `Could not read the target database (${e.code ?? "error"}): ${e.message}`,
    ]);
  }
  const markerErrors = checkMarker(env, target.marker);
  if (markerErrors.length) return fail(markerErrors);

  console.log(
    `Target verified: ${env.APP_ENV} / Neon branch ${env.NEON_BRANCH_ID} / endpoint ${env.NEON_ENDPOINT_ID}`,
  );
  console.log(
    `Restore point before migration: ${target.restorePoint.at} (LSN ${target.restorePoint.lsn})`,
  );
  if (env.GITHUB_OUTPUT)
    appendFileSync(
      env.GITHUB_OUTPUT,
      `restore-at=${target.restorePoint.at}\nrestore-lsn=${target.restorePoint.lsn}\n`,
    );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
