/**
 * Casa Nei PWA - Lógica de cliente para suscripción Web Push (FCM / APNs)
 */

// Elementos de la interfaz
const statMode = document.getElementById('statMode');
const statPermission = document.getElementById('statPermission');
const statProvider = document.getElementById('statProvider');
const btnSubscribe = document.getElementById('btnSubscribe');
const btnSubscribeText = document.getElementById('btnSubscribeText');
const btnStartCountdown = document.getElementById('btnStartCountdown');
const countdownContainer = document.getElementById('countdownContainer');
const countdownNumber = document.getElementById('countdownNumber');
const consoleLog = document.getElementById('consoleLog');
const iosHint = document.getElementById('iosHint');

let swRegistration = null;
let currentSubscription = null;

// Función para registrar mensajes en la consola visual
function log(msg) {
  const time = new Date().toLocaleTimeString();
  consoleLog.textContent = `[${time}] ${msg}\n` + consoleLog.textContent;
  console.log(`[PWA] ${msg}`);
}

// Conversor de clave pública Base64Url a Uint8Array (requerido por pushManager.subscribe)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Inicialización de la aplicación
async function init() {
  // 1. Detectar modo standalone (PWA instalada)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  statMode.innerHTML = isStandalone ? '<span style="color: #10b981;">📱 Instalada (PWA)</span>' : '<span style="color: #fbbf24;">🌐 Navegador Web</span>';

  // 2. Detectar iOS para mostrar guía de instalación
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isIos && !isStandalone) {
    iosHint.style.display = 'block';
  }

  // 3. Verificar compatibilidad con Service Worker y Push
  if (!('serviceWorker' in navigator)) {
    log('❌ Service Worker no es soportado en este navegador.');
    statPermission.textContent = 'No soportado';
    return;
  }

  if (!('PushManager' in window)) {
    log('⚠️ PushManager no soportado. (En iPhone requiere agregar a pantalla de inicio).');
    statPermission.textContent = 'Push no disponible';
    return;
  }

  try {
    // 4. Registrar Service Worker con scope /pwa-test/
    swRegistration = await navigator.serviceWorker.register('/pwa-test/sw.js', { scope: '/pwa-test/' });
    log('✅ Service Worker registrado con éxito (scope: /pwa-test/).');

    // 5. Verificar estado actual de permisos
    actualizarEstadoPermisos();

    // 6. Verificar si ya existe suscripción previa
    currentSubscription = await swRegistration.pushManager.getSubscription();
    if (currentSubscription) {
      log('ℹ️ Suscripción push activa encontrada.');
      actualizarProveedorUI(currentSubscription.endpoint);
      btnStartCountdown.disabled = false;
      btnSubscribeText.textContent = 'Actualizar Suscripción Push';
    } else {
      log('ℹ️ Sin suscripción push activa. Presiona el botón para activar.');
    }
  } catch (err) {
    log(`❌ Error al inicializar Service Worker: ${err.message}`);
  }
}

// Actualiza el indicador visual de permisos
function actualizarEstadoPermisos() {
  const perm = Notification.permission;
  if (perm === 'granted') {
    statPermission.innerHTML = '<span style="color: #10b981;">Concedido ✅</span>';
  } else if (perm === 'denied') {
    statPermission.innerHTML = '<span style="color: #ef4444;">Denegado ❌</span>';
  } else {
    statPermission.innerHTML = '<span style="color: #fbbf24;">Pendiente ⏳</span>';
  }
}

// Actualiza el proveedor push detectado (FCM o APNs)
function actualizarProveedorUI(endpoint) {
  if (endpoint.includes('fcm.googleapis.com')) {
    statProvider.innerHTML = '<span style="color: #10b981;">🟢 Google FCM (Android)</span>';
  } else if (endpoint.includes('push.apple.com')) {
    statProvider.innerHTML = '<span style="color: #10b981;">🟢 Apple APNs (iOS)</span>';
  } else {
    statProvider.innerHTML = '<span style="color: #10b981;">🟢 Web Push Estándar</span>';
  }
}

// Evento: Botón Activar / Suscribir Notificaciones Push
btnSubscribe.addEventListener('click', async () => {
  btnSubscribe.disabled = true;
  log('Iniciando proceso de suscripción Web Push...');

  try {
    // 1. Solicitar permiso de notificación explícito
    const permission = await Notification.requestPermission();
    actualizarEstadoPermisos();

    if (permission !== 'granted') {
      log('❌ Permiso de notificaciones rechazado por el usuario.');
      alert('Debes permitir las notificaciones para que el celular pueda recibir las alertas de citas.');
      btnSubscribe.disabled = false;
      return;
    }
    log('✅ Permiso de notificaciones otorgado por el sistema.');

    // 2. Obtener la clave pública VAPID del servidor PHP
    log('Solicitando clave pública VAPID al servidor...');
    const vapidRes = await fetch('/api/pwa/vapid-key');
    const vapidJson = await vapidRes.json();

    if (!vapidJson.success || !vapidJson.data?.publicKey) {
      throw new Error(vapidJson.error || 'No se pudo obtener la clave VAPID');
    }

    const applicationServerKey = urlBase64ToUint8Array(vapidJson.data.publicKey);
    log('Clave VAPID recibida y convertida.');

    // 3. Suscribir el dispositivo ante el Push Service del navegador (Google FCM / Apple APNs)
    log('Contactando servicio Push del navegador...');
    currentSubscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey
    });

    const subJson = currentSubscription.toJSON();
    log(`Endpoint obtenido: ${subJson.endpoint.substring(0, 45)}...`);

    // 4. Enviar la suscripción al servidor PHP para guardarla
    log('Registrando suscripción en el servidor PHP...');
    const regRes = await fetch('/api/pwa/suscribir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subJson)
    });
    const regData = await regRes.json();

    if (!regData.success) {
      throw new Error(regData.error || 'Error al persistir la suscripción');
    }

    actualizarProveedorUI(subJson.endpoint);
    btnStartCountdown.disabled = false;
    btnSubscribeText.textContent = 'Suscripción Activa ✅';
    log(`🎉 ¡Dispositivo suscrito exitosamente a ${regData.data?.proveedor || 'Web Push'}!`);
  } catch (err) {
    log(`❌ Error en la suscripción: ${err.message}`);
    alert(`Error al suscribir: ${err.message}`);
  } finally {
    btnSubscribe.disabled = false;
  }
});

// Evento: Botón Simular Cita en 3 Segundos
btnStartCountdown.addEventListener('click', async () => {
  if (!currentSubscription) {
    alert('Primero activa las notificaciones push.');
    return;
  }

  btnStartCountdown.disabled = true;
  countdownContainer.style.display = 'flex';
  let secondsLeft = 3;
  countdownNumber.textContent = secondsLeft;

  log('⏱️ Cuenta regresiva iniciada (3 segundos)...');
  log('Despachando solicitud con delay=3 al servidor PHP...');

  // Enviamos la petición al servidor con delay=3 de inmediato.
  // Así el servidor ejecuta sleep(3) y manda el Web Push real,
  // garantizando la llegada incluso si el usuario apaga la pantalla de inmediato.
  fetch('/api/pwa/enviar-prueba?delay=3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: currentSubscription.toJSON() })
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        log(`🚀 Push despachado por el servidor exitosamente: HTTP ${data.data?.http_code} (${data.data?.servicio})`);
      } else {
        log(`⚠️ Respuesta del servidor: ${data.error}`);
      }
    })
    .catch((err) => {
      log(`❌ Error al contactar el servidor: ${err.message}`);
    });

  // Animación del contador visual en pantalla
  const interval = setInterval(() => {
    secondsLeft--;
    if (secondsLeft > 0) {
      countdownNumber.textContent = secondsLeft;
    } else {
      clearInterval(interval);
      countdownNumber.textContent = '🔔';
      log('¡Tiempo cumplido! La alerta ha sido emitida hacia tu celular.');

      setTimeout(() => {
        countdownContainer.style.display = 'none';
        btnStartCountdown.disabled = false;
      }, 3000);
    }
  }, 1000);
});

// Arrancar inicialización al cargar la página
window.addEventListener('DOMContentLoaded', init);
