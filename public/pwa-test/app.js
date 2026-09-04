/**
 * Casa Nei PWA - Lógica de cliente para suscripción Web Push (FCM / APNs)
 * Compatible con subdirectorios (ej: /casa-nei/pwa-test/) y soporte especializado para iOS Safari / PWA.
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

// Base API URL calculada dinámicamente relativa a la ubicación actual
// Si estamos en https://ola-verde-colima.xyz/casa-nei/pwa-test/ -> apiBase = https://ola-verde-colima.xyz/casa-nei/api/
const apiBase = new URL('../api/', window.location.href).href;

// Función para registrar mensajes en la consola visual
function log(msg) {
  const time = new Date().toLocaleTimeString();
  if (consoleLog) {
    consoleLog.textContent = `[${time}] ${msg}\n` + consoleLog.textContent;
  }
  console.log(`[PWA ${time}] ${msg}`);
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
  log(`Iniciando en: ${window.location.href}`);
  log(`API Base detectada: ${apiBase}`);

  // 1. Detectar modo standalone (PWA instalada en iOS o Android)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  statMode.innerHTML = isStandalone
    ? '<span style="color: #10b981;">📱 Instalada (PWA)</span>'
    : '<span style="color: #fbbf24;">🌐 Navegador Web</span>';

  // 2. Detectar iOS para mostrar advertencia o guía
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isIos && !isStandalone && iosHint) {
    iosHint.style.display = 'block';
  }

  // 3. Validar soporte de APIs en el navegador móvil
  if (!('serviceWorker' in navigator)) {
    log('❌ Service Worker NO soportado en este navegador.');
    statPermission.textContent = 'No soportado';
    return;
  }

  if (!('PushManager' in window)) {
    if (isIos && !isStandalone) {
      log('⚠️ PushManager no disponible en Safari normal. DEBES agregar la app a pantalla de inicio en iOS 16.4+ para habilitar Push.');
    } else {
      log('⚠️ PushManager no detectado en este dispositivo.');
    }
  }

  try {
    // 4. Registrar Service Worker con ruta relativa 'sw.js'
    swRegistration = await navigator.serviceWorker.register('sw.js', { scope: './' });
    log('✅ Service Worker registrado con éxito en scope relativo.');

    // Esperar a que el Service Worker esté listo
    await navigator.serviceWorker.ready;
    log('✅ Service Worker activo y listo.');

    // 5. Verificar estado actual de permisos
    actualizarEstadoPermisos();

    // 6. Verificar si ya existe suscripción previa
    if (swRegistration.pushManager) {
      currentSubscription = await swRegistration.pushManager.getSubscription();
      if (currentSubscription) {
        log('ℹ️ Suscripción push activa recuperada.');
        actualizarProveedorUI(currentSubscription.endpoint);
        btnStartCountdown.disabled = false;
        btnSubscribeText.textContent = 'Actualizar Suscripción Push';
      } else {
        log('ℹ️ Sin suscripción previa. Toca el botón para activar notificaciones.');
      }
    }
  } catch (err) {
    log(`❌ Error al inicializar Service Worker: ${err.message}`);
  }
}

// Actualiza el indicador visual de permisos
function actualizarEstadoPermisos() {
  if (!('Notification' in window)) {
    statPermission.innerHTML = '<span style="color: #ef4444;">No disponible</span>';
    return;
  }
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
  if (!endpoint) return;
  if (endpoint.includes('fcm.googleapis.com')) {
    statProvider.innerHTML = '<span style="color: #10b981;">🟢 Google FCM (Android)</span>';
  } else if (endpoint.includes('push.apple.com')) {
    statProvider.innerHTML = '<span style="color: #10b981;">🟢 Apple APNs (iOS)</span>';
  } else {
    statProvider.innerHTML = '<span style="color: #10b981;">🟢 Web Push Estándar</span>';
  }
}

// Solicitar permisos de notificación (compatible con Promise y Callback en WebKit)
async function solicitarPermisoNotificacion() {
  if (!('Notification' in window)) {
    throw new Error('La API de Notificaciones no está disponible en este navegador.');
  }

  // Si ya están concedidos
  if (Notification.permission === 'granted') {
    return 'granted';
  }

  // Compatibilidad con Promise y Callback para distintas versiones de iOS Safari
  let permission;
  try {
    permission = await Notification.requestPermission();
  } catch (err) {
    permission = await new Promise((resolve) => {
      Notification.requestPermission((result) => resolve(result));
    });
  }
  return permission;
}

// Evento: Botón Activar / Suscribir Notificaciones Push
btnSubscribe.addEventListener('click', async () => {
  btnSubscribe.disabled = true;
  log('👉 Iniciando proceso de activación de Web Push...');

  try {
    // 1. Solicitar permiso explícito al sistema operativo
    const permission = await solicitarPermisoNotificacion();
    actualizarEstadoPermisos();

    if (permission !== 'granted') {
      log('❌ Permiso de notificaciones no fue concedido (estado: ' + permission + ').');
      if (permission === 'denied') {
        alert('Las notificaciones están bloqueadas para esta aplicación. En tu iPhone ve a Configuración > Notificaciones y permite las alertas para Casa Nei.');
      } else {
        alert('Debes aceptar el diálogo de notificaciones para poder recibir alertas.');
      }
      btnSubscribe.disabled = false;
      return;
    }
    log('✅ Permiso de notificaciones otorgado por el sistema.');

    // 2. Validar que el Service Worker esté listo
    if (!swRegistration) {
      log('Registrando Service Worker antes de suscribir...');
      swRegistration = await navigator.serviceWorker.ready;
    }

    if (!swRegistration.pushManager) {
      throw new Error('PushManager no está disponible en este dispositivo. Asegúrate de haber instalado la PWA desde la pantalla de inicio.');
    }

    // 3. Obtener la clave pública VAPID del servidor PHP
    const vapidUrl = `${apiBase}pwa/vapid-key`;
    log(`Solicitando clave VAPID a: ${vapidUrl}`);

    const vapidRes = await fetch(vapidUrl);
    if (!vapidRes.ok) {
      throw new Error(`Servidor retornó HTTP ${vapidRes.status} al consultar clave VAPID.`);
    }

    const vapidJson = await vapidRes.json();
    if (!vapidJson.success || !vapidJson.data?.publicKey) {
      throw new Error(vapidJson.error || 'No se recibió la clave pública VAPID.');
    }

    const applicationServerKey = urlBase64ToUint8Array(vapidJson.data.publicKey);
    log('Clave VAPID recibida y convertida correctamente.');

    // 4. Suscribir el dispositivo ante el Push Service del navegador (Apple APNs o Google FCM)
    log('Contactando servicio Push de Apple / Google...');
    currentSubscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey
    });

    const subJson = currentSubscription.toJSON();
    log(`🎉 Suscripción generada! Endpoint: ${subJson.endpoint.substring(0, 50)}...`);

    // 5. Enviar la suscripción al servidor PHP para guardarla
    const subUrl = `${apiBase}pwa/suscribir`;
    log(`Enviando suscripción al servidor: ${subUrl}`);

    const regRes = await fetch(subUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subJson)
    });
    const regData = await regRes.json();

    if (!regData.success) {
      throw new Error(regData.error || 'Error al persistir la suscripción en el servidor.');
    }

    actualizarProveedorUI(subJson.endpoint);
    btnStartCountdown.disabled = false;
    btnSubscribeText.textContent = 'Suscripción Activa ✅';
    log(`✅ ¡Dispositivo registrado exitosamente con ${regData.data?.proveedor || 'Web Push'}!`);
    alert(`¡Listo! Notificaciones activadas correctamente con ${regData.data?.proveedor || 'Apple APNs / Google FCM'}. Ahora puedes hacer la prueba de los 3 segundos.`);
  } catch (err) {
    log(`❌ Error: ${err.message}`);
    alert(`Error al activar notificaciones: ${err.message}`);
  } finally {
    btnSubscribe.disabled = false;
  }
});

// Evento: Botón Simular Cita en 3 Segundos
btnStartCountdown.addEventListener('click', async () => {
  if (!currentSubscription) {
    alert('Primero debes presionar el botón de Activar Notificaciones Push.');
    return;
  }

  btnStartCountdown.disabled = true;
  countdownContainer.style.display = 'flex';
  let secondsLeft = 3;
  countdownNumber.textContent = secondsLeft;

  log('⏱️ Cuenta regresiva iniciada (3 segundos)...');
  log('⚡ Despachando orden de Push con delay=3 al servidor PHP...');

  // Se envía la petición al servidor con delay=3 de inmediato
  const testUrl = `${apiBase}pwa/enviar-prueba?delay=3`;
  fetch(testUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: currentSubscription.toJSON() })
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        log(`🚀 Servidor reporta entrega a ${data.data?.servicio}: HTTP ${data.data?.http_code}`);
      } else {
        log(`⚠️ Respuesta del servidor: ${data.error}`);
      }
    })
    .catch((err) => {
      log(`❌ Error de conexión con el servidor: ${err.message}`);
    });

  // Animación visual del contador en pantalla
  const interval = setInterval(() => {
    secondsLeft--;
    if (secondsLeft > 0) {
      countdownNumber.textContent = secondsLeft;
    } else {
      clearInterval(interval);
      countdownNumber.textContent = '🔔';
      log('¡3 segundos cumplidos! Revisa la notificación en la pantalla de tu celular.');

      setTimeout(() => {
        countdownContainer.style.display = 'none';
        btnStartCountdown.disabled = false;
      }, 3000);
    }
  }, 1000);
});

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
