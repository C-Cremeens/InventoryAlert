import { auth } from "@/lib/auth";
import { historyQuery, requestHistory } from "@/lib/request-history";
export async function GET(req: Request) {
  const session = await auth();
  if (
    !session?.user?.id ||
    !session.user.emailVerifiedAt ||
    !session.user.termsAcceptedAt
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const params = new URL(req.url).searchParams;
  return Response.json(
    await requestHistory(
      session.user.id,
      historyQuery(params.get("status"), params.get("page")),
    ),
    { headers: { "Cache-Control": "no-store" } },
  );
}
