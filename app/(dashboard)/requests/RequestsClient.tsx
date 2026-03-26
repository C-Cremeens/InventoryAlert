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
  PENDING: "bg-yellow-50 text-yellow-700",
  APPROVED: "bg-green-50 text-green-700",
  DECLINED: "bg-red-50 text-red-700",
};

export default function RequestsClient({ initialRequests, activeStatus }: Props) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [loading, setLoading] = useState<string | null>(null);

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
      {/* Tabs */}
      <div className="overflow-x-auto mb-5">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => handleTabChange(tab.value)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeStatus === tab.value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-16 text-gray-500 bg-white border border-gray-200 rounded-xl">
          <p className="text-sm">No requests found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Item</th>
                <th className="px-4 py-3 font-medium text-gray-600">Requested</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {r.item.name}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
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
                    {r.status === "PENDING" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(r.id, "APPROVED")}
                          disabled={loading === r.id}
                          className="px-3 py-1 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 disabled:opacity-50 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateStatus(r.id, "DECLINED")}
                          disabled={loading === r.id}
                          className="px-3 py-1 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 disabled:opacity-50 transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
