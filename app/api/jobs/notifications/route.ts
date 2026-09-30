import { authorizedJob } from "@/lib/cron-auth";
import { drainNotifications } from "@/lib/notifications";
export const maxDuration = 60;
export async function GET(req: Request) {
  if (!authorizedJob(req))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(
    { processed: await drainNotifications() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
