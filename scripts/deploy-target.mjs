// Validates a release job's deployment configuration before anything is built or migrated (#92).
// Fails closed: any missing or mismatched value blocks the release. Never prints secrets.
// See docs/deployment.md.
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { BRANCH_TARGETS } from "./migration-target.mjs";

// dev and uat deploy as branch-scoped Preview; only main may reach Production.
export const VERCEL_TARGETS = {
  dev: "preview",
  uat: "preview",
  main: "production",
};

const REQUIRED = [
  "VERCEL_TOKEN",
  "VERCEL_ORG_ID",
  "VERCEL_PROJECT_ID",
  "APP_ENV",
  "VERCEL_TARGET",
  "APP_BASE_URL",
  "PRODUCTION_HOST",
];

// Returns { errors, target } where target describes the validated release.
export function checkDeployConfig(env) {
  const branch = env.GIT_REF_NAME;
  const mapped = BRANCH_TARGETS[branch];
  if (!mapped)
    return {
      errors: [
        `Branch "${branch}" has no deployment target. Allowed: dev, uat, main.`,
      ],
    };
  const errors = [];
  for (const name of REQUIRED)
    if (!env[name]) errors.push(`${name} is not set.`);
  if (errors.length) return { errors };

  const vercelTarget = VERCEL_TARGETS[branch];
  if (env.APP_ENV !== mapped.appEnv)
    errors.push(
      `APP_ENV is "${env.APP_ENV}" but branch ${branch} must target "${mapped.appEnv}".`,
    );
  if (env.VERCEL_TARGET !== vercelTarget)
    errors.push(
      `VERCEL_TARGET is "${env.VERCEL_TARGET}" but branch ${branch} must deploy to "${vercelTarget}".`,
    );

  let url;
  try {
    url = new URL(env.APP_BASE_URL);
  } catch {
    return { errors: [...errors, "APP_BASE_URL is not a valid URL."] };
  }
  if (url.protocol !== "https:") errors.push("APP_BASE_URL must use https.");
  if (url.pathname !== "/" || url.search || url.hash)
    errors.push(
      "APP_BASE_URL must be an origin without a path, e.g. https://uat.example.com.",
    );

  const host = url.hostname.toLowerCase();
  const productionHost = env.PRODUCTION_HOST.toLowerCase();
  if (branch === "main" && host !== productionHost)
    errors.push(
      `APP_BASE_URL host "${host}" does not match PRODUCTION_HOST "${productionHost}".`,
    );
  if (branch !== "main" && host === productionHost)
    errors.push(
      `APP_BASE_URL for ${branch} is the production host. A ${branch} deployment can never receive the production domain.`,
    );

  return {
    errors,
    target: {
      environment: mapped.environment,
      appEnv: mapped.appEnv,
      vercelTarget,
      host,
      origin: url.origin,
    },
  };
}

export function main(env = process.env) {
  const { errors, target } = checkDeployConfig(env);
  if (errors.length) {
    for (const e of errors) console.log(`::error::${e}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `Deployment target verified: ${target.environment} / APP_ENV ${target.appEnv} / Vercel ${target.vercelTarget} / ${target.host}`,
  );
  if (env.GITHUB_OUTPUT)
    appendFileSync(
      env.GITHUB_OUTPUT,
      `vercel-target=${target.vercelTarget}\napp-env=${target.appEnv}\nhost=${target.host}\norigin=${target.origin}\n`,
    );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
