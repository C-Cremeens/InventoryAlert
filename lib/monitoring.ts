import * as Sentry from "@sentry/nextjs";

export function scrubEvent<T extends Sentry.ErrorEvent>(event: T): T {
  delete event.user;
  delete event.extra;
  // Query parameters can contain recovery/consent tokens; do not collect request bodies/headers.
  if (event.request) {
    event.request = {
      method: event.request.method,
      url: event.request.url?.split("?")[0],
    };
  }
  event.breadcrumbs = event.breadcrumbs
    ?.filter((b) => b.category !== "console")
    .map((b) => ({ ...b, data: undefined, message: b.message?.split("?")[0] }));
  return event;
}

export function reportError(message: string, ...details: unknown[]) {
  const error =
    details.find((value): value is Error => value instanceof Error) ??
    new Error(message);
  console.error(message, { name: error.name, message: error.message });
  if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)
    Sentry.captureException(error, { tags: { operation: message } });
}
