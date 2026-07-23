/*
 * No-op service worker — intentionally minimal.
 *
 * The previous service worker implementation had a fetch handler that
 * rejected fetch events with "Failed to convert value to Response",
 * serving stale cached bundles and forcing a manual page refresh after
 * login. This app does not need a service worker, so this file is now a
 * no-op shell.
 *
 * On activate we clear all caches and unregister this registration so no
 * service worker remains active. No fetch handler is registered, so this
 * SW never intercepts network requests. The client-side usePWAUpdate
 * hook also calls navigator.serviceWorker.getRegistrations().unregister()
 * on mount as a belt-and-suspenders cleanup for existing users.
 */

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      await self.clients.claim();
    })(),
  );
});

// No fetch handler — this service worker never intercepts requests.
