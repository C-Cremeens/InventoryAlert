import { authorizedJob } from "@/lib/cron-auth";
import { cleanOrphanedImages } from "@/lib/images";
import { prisma } from "@/lib/prisma";
export const maxDuration = 60;
export async function GET(req: Request) {
  if (!authorizedJob(req))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  await cleanOrphanedImages();
  await prisma.rateLimitWindow.deleteMany({
    where: { windowStart: { lt: new Date(Date.now() - 86400_000) } },
  });
  return Response.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
