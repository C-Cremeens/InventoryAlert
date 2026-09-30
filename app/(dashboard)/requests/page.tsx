import { auth } from "@/lib/auth";
import { historyQuery, requestHistory } from "@/lib/request-history";
import RequestsClient from "./RequestsClient";
export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session = await auth();
  if (
    !session?.user?.id ||
    !session.user.emailVerifiedAt ||
    !session.user.termsAcceptedAt
  )
    return null;
  const params = await searchParams;
  const query = historyQuery(params.status, params.page);
  const data = await requestHistory(session.user.id, query);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Stocking Requests</h1>
      <RequestsClient
        key={`${query.status}-${query.page}`}
        initialRequests={data.requests}
        activeStatus={query.status ?? null}
        page={query.page}
        initialHasMore={data.hasMore}
      />
    </div>
  );
}
