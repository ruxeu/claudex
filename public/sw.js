/* Claudex service worker: shows the notifications the server pushes (an account is available again) and opens Claudex when tapped. */
self.addEventListener("push", (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { title: "Claudex", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Claudex", { body: d.body || "", icon: "/icon-192.png", badge: "/icon-64.png", tag: d.tag || "claudex", renotify: true, data: { url: d.url || "/" } }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => { for (const c of list) if ("focus" in c) { c.navigate(url).catch(() => {}); return c.focus(); } return self.clients.openWindow(url); }));
});
