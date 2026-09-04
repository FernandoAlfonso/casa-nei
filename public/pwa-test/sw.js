/**
 * Service Worker para Casa Nei PWA - Gestión de Web Push y Confirmación Rápida
 * Compatible con cualquier subdirectorio (ej. /casa-nei/pwa-test/).
 */

// Instalación inmediata del Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activación y toma de control de los clientes abiertos
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Recepción de mensajes Web Push despachados por Apple APNs o Google FCM
self.addEventListener('push', (event) => {
  const scope = self.registration.scope;
  const iconUrl = new URL('icons/icon-192.png', scope).href;
  const defaultConfirmUrl = new URL('confirmar.html?cita_id=101&paciente=Mar%C3%ADa+L%C3%B3pez', scope).href;

  let notificationData = {
    title: '🔔 Solicitud de Cita - Casa Nei',
    body: 'María López ha solicitado una cita para Acupuntura Tradicional (Hoy 17:00 hrs).',
    icon: iconUrl,
    badge: iconUrl,
    tag: 'cita-101',
    renotify: true,
    data: {
      url: defaultConfirmUrl,
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

  // Asegurar rutas absolutas para iconos si se recibieron relativas
  if (!notificationData.icon || !notificationData.icon.startsWith('http')) {
    notificationData.icon = iconUrl;
  }

  // Asegurar que la URL interna de la cita siempre esté dentro del scope (/casa-nei/pwa-test/)
  if (notificationData.data && notificationData.data.url) {
    const cleanPath = notificationData.data.url
      .replace(/^https?:\/\/[^\/]+/, '')
      .replace(/^\/(?:casa-nei\/)?(?:pwa-test\/)?/, '');
    notificationData.data.url = new URL(cleanPath, scope).href;
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge || iconUrl,
    vibrate: [300, 100, 300, 100, 400],
    tag: notificationData.tag || 'cita-alerta',
    renotify: true,
    data: notificationData.data || { url: defaultConfirmUrl },
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

  const scope = self.registration.scope;
  const apiBase = new URL('../api/', scope).href;
  const confirmApiUrl = new URL('pwa/confirmar-cita', apiBase).href;

  const action = event.action;
  const notifData = event.notification.data || {};
  const citaId = notifData.cita_id || 101;
  const paciente = notifData.paciente || 'María López';

  const defaultUrl = new URL(`confirmar.html?cita_id=${citaId}&paciente=${encodeURIComponent(paciente)}`, scope).href;

  // Garantizar que la URL de destino apunte siempre dentro del scope actual (/casa-nei/pwa-test/)
  let targetUrl;
  if (notifData.url) {
    const cleanPath = notifData.url
      .replace(/^https?:\/\/[^\/]+/, '')
      .replace(/^\/(?:casa-nei\/)?(?:pwa-test\/)?/, '');
    targetUrl = new URL(cleanPath, scope).href;
  } else {
    targetUrl = defaultUrl;
  }

  // 1. Caso: Acción rápida "Confirmar Cita" (1 Toque directo desde la barra de notificaciones en Android)
  if (action === 'confirmar') {
    const successUrl = new URL(`confirmada.html?cita_id=${citaId}&paciente=${encodeURIComponent(paciente)}`, scope).href;

    event.waitUntil(
      fetch(confirmApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cita_id: citaId, paciente: paciente })
      })
        .then(() => {
          return self.registration.showNotification('✅ Cita Confirmada con Éxito', {
            body: `La cita de ${paciente} quedó confirmada en 1 toque.`,
            icon: new URL('icons/icon-192.png', scope).href,
            tag: 'cita-confirmada-' + citaId
          });
        })
        .then(() => {
          return abrirOEnfocarVentana(successUrl);
        })
        .catch((err) => {
          console.error('Error al confirmar en segundo plano:', err);
          return abrirOEnfocarVentana(targetUrl);
        })
    );
    return;
  }

  // 2. Caso: Clic en el cuerpo de la notificación (iOS y Universal)
  event.waitUntil(abrirOEnfocarVentana(targetUrl));
});

/**
 * Función auxiliar para abrir una nueva ventana o enfocar una existente.
 */
function abrirOEnfocarVentana(url) {
  return clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
    for (let client of windowClients) {
      if (client.url && 'focus' in client) {
        client.navigate(url);
        return client.focus();
      }
    }
    if (clients.openWindow) {
      return clients.openWindow(url);
    }
  });
}
