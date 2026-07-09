export async function register() {
  // Skip during `next build` — env vars are a runtime concern; CI builds
  // intentionally run without any configured environment.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { validateEnv } = await import("@/lib/env");
  validateEnv();
}
