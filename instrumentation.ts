import type { Instrumentation } from "next";

export async function register() {
  // Skip during `next build` — env vars are a runtime concern; CI builds
  // intentionally run without any configured environment.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { validateEnv } = await import("@/lib/env");
  validateEnv();
}

// Structured log line for every unhandled server error, so log drains and
// platform dashboards (e.g. Vercel) can filter and alert on them. If a
// monitoring service (Sentry etc.) is adopted, report from here too.
export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context
) => {
  const error =
    err instanceof Error
      ? {
          name: err.name,
          message: err.message,
          stack: err.stack,
          digest: (err as { digest?: string }).digest,
        }
      : { message: String(err) };

  console.error(
    JSON.stringify({
      level: "error",
      event: "unhandled_request_error",
      method: request.method,
      path: request.path,
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
      error,
      ts: new Date().toISOString(),
    })
  );
};
