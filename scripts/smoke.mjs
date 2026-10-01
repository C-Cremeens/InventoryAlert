// Post-deployment smoke test (#92). Checks /api/health on each URL reports a healthy database,
// the intended environment (app and database marker) and the deployed revision.
// A failure exits non-zero, which stops the release and any later promotion.
import { pathToFileURL } from "node:url";

// Returns a list of errors for one /api/health response body; empty means healthy.
export function checkHealth(body, expected) {
  if (!body || typeof body !== "object")
    return ["/api/health did not return JSON."];
  const errors = [];
  if (body.ok !== true)
    errors.push("/api/health reports the database is unreachable.");
  if (body.appEnv !== expected.appEnv)
    errors.push(
      `App reports APP_ENV "${body.appEnv}", expected "${expected.appEnv}".`,
    );
  if (body.dbEnv !== expected.appEnv)
    errors.push(
      `Database environment marker reads "${body.dbEnv}", expected "${expected.appEnv}". ` +
        "The runtime DATABASE_URL may point at the wrong Neon branch, or the runtime role cannot read the marker.",
    );
  if (body.revision !== expected.revision)
    errors.push(
      `App reports revision "${body.revision}", expected "${expected.revision}".`,
    );
  return errors;
}

// Polls one URL until its health check passes or attempts run out. Returns the last errors.
export async function smoke(
  baseUrl,
  expected,
  { fetchImpl = fetch, attempts = 10, delayMs = 6000, bypassSecret = "" } = {},
) {
  const url = new URL("/api/health", baseUrl);
  const headers = { Accept: "application/json", "Cache-Control": "no-cache" };
  if (bypassSecret) headers["x-vercel-protection-bypass"] = bypassSecret;
  let errors = [];
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetchImpl(url, {
        headers,
        cache: "no-store",
        redirect: "manual",
      });
      const body = await res.json().catch(() => undefined);
      errors = checkHealth(body, expected);
      if (!errors.length && res.status !== 200)
        errors = [`/api/health returned HTTP ${res.status}.`];
      if (!body)
        errors = [`/api/health returned HTTP ${res.status} without JSON.`];
    } catch (e) {
      errors = [`Request failed: ${e.message}`];
    }
    if (!errors.length) return [];
    if (i < attempts) await new Promise((r) => setTimeout(r, delayMs));
  }
  return errors;
}

export async function main(env = process.env) {
  const urls = (env.SMOKE_URLS ?? "").split(/\s+/).filter(Boolean);
  const expected = {
    appEnv: env.EXPECTED_APP_ENV,
    revision: env.EXPECTED_REVISION,
  };
  if (!urls.length || !expected.appEnv || !expected.revision) {
    console.log(
      "::error::SMOKE_URLS, EXPECTED_APP_ENV and EXPECTED_REVISION are required.",
    );
    process.exitCode = 1;
    return;
  }
  for (const url of urls) {
    const errors = await smoke(url, expected, {
      bypassSecret: env.VERCEL_AUTOMATION_BYPASS_SECRET || undefined,
    });
    // Only the origin is printed; the bypass secret never is.
    const origin = new URL(url).origin;
    if (errors.length) {
      for (const e of errors)
        console.log(`::error::Smoke test failed for ${origin}: ${e}`);
      process.exitCode = 1;
      return;
    }
    console.log(
      `Smoke test passed for ${origin}: ${expected.appEnv} @ ${expected.revision}`,
    );
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
