/**
 * Hosted environment identity (#92). APP_ENV is set explicitly per Vercel
 * environment/branch scope; NODE_ENV is "production" for every optimized build
 * and is not an environment identity.
 */
export const APP_ENVS = ["dev", "uat", "production"] as const;
export type AppEnv = (typeof APP_ENVS)[number];

export function getAppEnv(): AppEnv | undefined {
  const value = process.env.APP_ENV;
  return APP_ENVS.find((e) => e === value);
}

/** Hosted dev/UAT and any Vercel preview: show the banner and keep out of search indexes. */
export function isNonProductionDeployment(): boolean {
  const appEnv = getAppEnv();
  return (
    appEnv === "dev" || appEnv === "uat" || process.env.VERCEL_ENV === "preview"
  );
}
