// Push notification handler for service worker
self.addEventListener("push", function (event) {
  if (!event.data) {
    console.log("Push event but no data");
    return;
  }

  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || "",
      icon: data.icon || "/logo.png",
      badge: "/logo.png",
      vibrate: [100, 50, 100],
      data: data.data || { url: "/" },
      actions: [
        { action: "open", title: "Abrir" },
        { action: "close", title: "Fechar" },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || "Maridaas", options)
    );
  } catch (e) {
    console.error("Error handling push event:", e);
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  if (event.action === "close") {
    return;
  }

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});