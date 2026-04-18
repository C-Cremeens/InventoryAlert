self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "InventoryAlert", body: event.data.text() };
  }

  const title = payload.title || "InventoryAlert";
  const options = {
    body: payload.body || "You have a new update.",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: payload.tag || "inventoryalert-notification",
    data: {
      url: payload.url || "/requests",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/requests";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
