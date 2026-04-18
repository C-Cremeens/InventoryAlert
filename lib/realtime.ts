type StockingRequestRealtimeEvent = {
  requestId: string;
  itemId: string;
  itemName: string;
  status: "PENDING" | "APPROVED" | "DECLINED";
  emailSent: boolean;
  createdAt: string;
};

type Listener = (event: StockingRequestRealtimeEvent) => void;

const listenersByUser = new Map<string, Set<Listener>>();

export function subscribeToStockingRequests(userId: string, listener: Listener) {
  const listeners = listenersByUser.get(userId) ?? new Set<Listener>();
  listeners.add(listener);
  listenersByUser.set(userId, listeners);

  return () => {
    const current = listenersByUser.get(userId);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) listenersByUser.delete(userId);
  };
}

export function publishStockingRequestEvent(userId: string, event: StockingRequestRealtimeEvent) {
  const listeners = listenersByUser.get(userId);
  if (!listeners || listeners.size === 0) return;

  for (const listener of listeners) {
    try {
      listener(event);
    } catch (err) {
      console.error("stocking request realtime listener failed", err);
    }
  }
}

export type { StockingRequestRealtimeEvent };
