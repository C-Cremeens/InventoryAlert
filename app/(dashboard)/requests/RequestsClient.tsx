"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RequestStatus } from "@prisma/client";

const FILTER_KEY = "requests-status-filter";

interface Request {
  id: string;
  status: RequestStatus;
  emailSent: boolean;
  createdAt: Date;
  item: { name: string; id: string };
}

interface RealtimeEvent {
  requestId: string;
  itemId: string;
  itemName: string;
  status: RequestStatus;
  emailSent: boolean;
  createdAt: string;
}

interface Props {
  initialRequests: Request[];
  activeStatus: RequestStatus | null;
}

const TABS: { label: string; value: RequestStatus | null }[] = [
  { label: "All", value: null },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Declined", value: "DECLINED" },
];

const statusStyles: Record<RequestStatus, string> = {
  PENDING: "bg-tertiary-fixed/60 text-on-tertiary-container",
  APPROVED: "bg-secondary-container/40 text-on-secondary-container",
  DECLINED: "bg-error-container text-on-error-container",
};

export default function RequestsClient({ initialRequests, activeStatus }: Props) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [loading, setLoading] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<"connecting" | "live" | "offline">("connecting");

  // Sync local state when the server sends new filtered data after navigation
  useEffect(() => {
    setRequests(initialRequests);
  }, [initialRequests]);

  // Restore persisted filter on initial load when no filter is in the URL
  useEffect(() => {
    if (activeStatus === null) {
      const saved = localStorage.getItem(FILTER_KEY) as RequestStatus | null;
      if (saved) {
        router.replace(`/requests?status=${saved}`);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const source = new EventSource("/api/requests/stream");

    source.addEventListener("connected", () => {
      setLiveStatus("live");
    });

    source.addEventListener("stocking-request", (event) => {
      setLiveStatus("live");
      const payload = JSON.parse((event as MessageEvent).data) as RealtimeEvent;

      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("New stocking request", {
          body: `${payload.itemName} needs attention.`,
          tag: `stocking-request-${payload.requestId}`,
        });
      }

      setRequests((prev) => {
        const exists = prev.some((request) => request.id === payload.requestId);
        if (exists) return prev;

        const nextRequest: Request = {
          id: payload.requestId,
          status: payload.status,
          emailSent: payload.emailSent,
          createdAt: new Date(payload.createdAt),
          item: {
            id: payload.itemId,
            name: payload.itemName,
          },
        };

        if (activeStatus && nextRequest.status !== activeStatus) {
          return prev;
        }

        return [nextRequest, ...prev];
      });
    });

    source.onerror = () => {
      setLiveStatus("offline");
    };

    return () => {
      source.close();
    };
  }, [activeStatus]);

  function handleTabChange(status: RequestStatus | null) {
    if (status) {
      localStorage.setItem(FILTER_KEY, status);
    } else {
      localStorage.removeItem(FILTER_KEY);
    }
    const url = status ? `/requests?status=${status}` : "/requests";
    router.push(url);
  }

  async function updateStatus(id: string, status: "APPROVED" | "DECLINED") {
    setLoading(id);
    const res = await fetch(`/api/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setRequests((prev) => {
        const updated = prev.map((r) => (r.id === id ? { ...r, status } : r));
        // Remove items that no longer match the active filter
        return activeStatus ? updated.filter((r) => r.status === activeStatus) : updated;
      });
    }
    setLoading(null);
  }

  return (
    <div>
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-outline-variant px-3 py-1 text-xs">
        <span
          className={`h-2 w-2 rounded-full ${
            liveStatus === "live"
              ? "bg-secondary"
              : liveStatus === "connecting"
                ? "bg-tertiary"
                : "bg-error"
          }`}
        />
        <span className="text-on-surface-variant">
          {liveStatus === "live"
            ? "Live updates on"
            : liveStatus === "connecting"
              ? "Connecting live updates…"
              : "Live updates disconnected"}
        </span>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto mb-5">
      <div className="flex gap-1 bg-surface-container rounded-2xl p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => handleTabChange(tab.value)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${
              activeStatus === tab.value
                ? "bg-primary text-on-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-16 text-on-surface-variant bg-surface-container-lowest rounded-xl">
          <p className="text-sm">No requests found.</p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container text-left">
                <th className="px-4 py-3 font-medium text-on-surface-variant">Item</th>
                <th className="px-4 py-3 font-medium text-on-surface-variant">Requested</th>
                <th className="px-4 py-3 font-medium text-on-surface-variant">Status</th>
                <th className="px-4 py-3 font-medium text-on-surface-variant">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-outline-variant last:border-0">
                  <td className="px-4 py-3 font-medium text-on-surface">
                    {r.item.name}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusStyles[r.status]}`}
                    >
                      {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ActionButtons
                      requestId={r.id}
                      requestStatus={r.status}
                      loading={loading}
                      onApprove={updateStatus}
                      onDecline={updateStatus}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <ul className="divide-y divide-outline-variant md:hidden">
            {requests.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-on-surface truncate">{r.item.name}</p>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {new Date(r.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusStyles[r.status]}`}
                  >
                    {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                  </span>
                </div>
                <div className="mt-3">
                  <ActionButtons
                    requestId={r.id}
                    requestStatus={r.status}
                    loading={loading}
                    onApprove={updateStatus}
                    onDecline={updateStatus}
                    mobile
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ActionButtons({
  requestId,
  requestStatus,
  loading,
  onApprove,
  onDecline,
  mobile = false,
}: {
  requestId: string;
  requestStatus: RequestStatus;
  loading: string | null;
  onApprove: (id: string, status: "APPROVED" | "DECLINED") => Promise<void>;
  onDecline: (id: string, status: "APPROVED" | "DECLINED") => Promise<void>;
  mobile?: boolean;
}) {
  if (requestStatus !== "PENDING") {
    return <span className="text-xs text-on-surface-variant">—</span>;
  }

  return (
    <div className={`flex gap-2 ${mobile ? "flex-col sm:flex-row" : "flex-row"}`}>
      <button
        onClick={() => onApprove(requestId, "APPROVED")}
        disabled={loading === requestId}
        className="px-3 py-2 text-xs font-medium bg-secondary-container/30 text-on-secondary-container border border-secondary/20 rounded-lg hover:bg-secondary-container/50 disabled:opacity-50 transition-colors"
      >
        Approve
      </button>
      <button
        onClick={() => onDecline(requestId, "DECLINED")}
        disabled={loading === requestId}
        className="px-3 py-2 text-xs font-medium bg-error-container text-on-error-container border border-error/20 rounded-lg hover:opacity-80 disabled:opacity-50 transition-colors"
      >
        Decline
      </button>
    </div>
  );
}
