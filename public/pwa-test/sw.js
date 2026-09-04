/**
 * Service Worker para Casa Nei PWA - Gestión de Web Push y Confirmación Rápida
 */

const CACHE_NAME = 'casa-nei-pwa-v1';

// Instalación inmediata del Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activación y toma de control de los clientes abiertos
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Recepción de mensajes Web Push despachados por Google FCM o Apple APNs
self.addEventListener('push', (event) => {
  let notificationData = {
    title: '🔔 Solicitud de Cita - Casa Nei',
    body: 'María López ha solicitado una cita para Acupuntura Tradicional (Hoy 17:00 hrs).',
    icon: '/pwa-test/icons/icon-192.png',
    badge: '/pwa-test/icons/icon-192.png',
    tag: 'cita-101',
    renotify: true,
    data: {
      url: '/pwa-test/confirmar.html?cita_id=101&paciente=Mar%C3%ADa+L%C3%B3pez',
      cita_id: 101,
      paciente: 'María López'
    },
    actions: [
      { action: 'confirmar', title: '✅ Confirmar Cita' },
      { action: 'ver', title: '📋 Ver Solicitud' }
    ]
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = Object.assign(notificationData, payload);
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon || '/pwa-test/icons/icon-192.png',
    badge: notificationData.badge || '/pwa-test/icons/icon-192.png',
    vibrate: [300, 100, 300, 100, 400],
    tag: notificationData.tag || 'cita-alerta',
    renotify: true,
    requireInteraction: true,
    data: notificationData.data || {},
    actions: notificationData.actions || [
      { action: 'confirmar', title: '✅ Confirmar Cita' },
      { action: 'ver', title: '📋 Ver Solicitud' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Interacción del usuario con la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const notifData = event.notification.data || {};
  const citaId = notifData.cita_id || 101;
  const paciente = notifData.paciente || 'María López';
  const targetUrl = notifData.url || `/pwa-test/confirmar.html?cita_id=${citaId}`;

  // 1. Caso: Acción rápida "Confirmar Cita" (1 Toque directo desde la barra de notificaciones en Android)
  if (action === 'confirmar') {
    event.waitUntil(
      fetch('/api/pwa/confirmar-cita', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cita_id: citaId, paciente: paciente })
      })
        .then(() => {
          // Mostrar notificación de confirmación inmediata
          return self.registration.showNotification('✅ Cita Confirmada con Éxito', {
            body: `La cita de ${paciente} quedó confirmada en 1 toque.`,
            icon: '/pwa-test/icons/icon-192.png',
            tag: 'cita-confirmada-' + citaId
          });
        })
        .then(() => {
          return abrirOEnfocarVentana(`/pwa-test/confirmada.html?cita_id=${citaId}&paciente=${encodeURIComponent(paciente)}`);
        })
        .catch((err) => {
          console.error('Error al confirmar en segundo plano:', err);
          return abrirOEnfocarVentana(targetUrl);
        })
    );
    return;
  }

  // 2. Caso: Clic en el globo de notificación o acción "Ver"
  // Redirecciona a la vista preparada con los datos listos para confirmar en 1 tap
  event.waitUntil(abrirOEnfocarVentana(targetUrl));
});

/**
 * Función auxiliar para abrir una nueva ventana o enfocar una existente.
 */
function abrirOEnfocarVentana(url) {
  return clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
    for (let client of windowClients) {
      if (client.url.includes('/pwa-test/') && 'focus' in client) {
        client.navigate(url);
        return client.focus();
      }
    }
    if (clients.openWindow) {
      return clients.openWindow(url);
    }
  });
}
