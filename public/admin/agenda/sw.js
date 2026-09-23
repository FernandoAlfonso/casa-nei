/**
 * Service Worker para Casa Nei - Agenda Admin
 * Scope: ./ (relativo al subdirectorio /admin/agenda/)
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listener preparado para la futura recepción de notificaciones push de citas
self.addEventListener('push', (event) => {
  const scope = self.registration.scope;
  const iconUrl = new URL('icons/icon-192.png', scope).href;

  let notificationData = {
    title: '🔔 Casa Nei - Agenda Admin',
    body: 'Tienes una nueva actualización en tu agenda.',
    icon: iconUrl,
    badge: iconUrl,
    data: { url: scope }
  };

  if (event.data) {
    try {
      notificationData = Object.assign(notificationData, event.data.json());
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon || iconUrl,
      badge: notificationData.badge || iconUrl,
      vibrate: [200, 100, 200],
      data: notificationData.data
    })
  );
});

// Apertura de la PWA al pulsar la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const scope = self.registration.scope;
  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : scope;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(scope) && 'focus' in client) {
          if ('navigate' in client) {
            return client.navigate(targetUrl).then(c => c.focus());
          } else {
            return client.focus();
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
