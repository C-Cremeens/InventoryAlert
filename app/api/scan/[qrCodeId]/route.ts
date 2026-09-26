import { after } from "next/server";
import { z } from "zod";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { recordScan } from "@/lib/scan";
import { drainNotifications } from "@/lib/notifications";
export const maxDuration = 60;
export async function POST(
  req: Request,
  { params }: { params: Promise<{ qrCodeId: string }> },
) {
  const { qrCodeId } = await params;
  const key = req.headers.get("Idempotency-Key");
  if (!z.uuid().safeParse(qrCodeId).success || !z.uuid().safeParse(key).success)
    return Response.json(
      { error: "Invalid report. Please reopen the QR code." },
      { status: 400 },
    );
  for (const [scope, limit] of [
    [`scan:ip:${getClientIp(req)}`, 60],
    [`scan:item:${qrCodeId}`, 120],
  ] as const) {
    const result = await checkRateLimit(
      scope,
      { limit, windowSeconds: 3600 },
      true,
    );
    if (!result.allowed) return rateLimitResponse(result.retryAfterSeconds);
  }
  const result = await recordScan(qrCodeId, key!);
  if (!result)
    return Response.json({ error: "Item not found." }, { status: 404 });
  if (result.requestId)
    after(async () => {
      await drainNotifications(result.requestId!);
    });
  return Response.json(result, { status: result.created ? 201 : 200 });
}
