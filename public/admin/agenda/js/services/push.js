import ApiService from './api.js';

export default class PushService {
  /**
   * Helper to convert Base64 URL to Uint8Array
   */
  static urlB64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
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

  /**
   * Requests permission, fetches VAPID key, subscribes to PushManager, and sends to backend.
   */
  static async subscribeDevice() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push no soportado en este navegador.');
      return false;
    }

    try {
      let permission;
      try {
        permission = await Notification.requestPermission();
      } catch (e) {
        permission = await new Promise((resolve) => {
          Notification.requestPermission((result) => resolve(result));
        });
      }

      if (permission !== 'granted') {
        console.warn('Permiso de notificaciones denegado.');
        return false;
      }

      // Fetch VAPID Key from backend
      const vapidRes = await ApiService.get('/admin/vapid-key');
      const publicKey = vapidRes.data.publicKey;

      if (!publicKey) {
        throw new Error('No se recibió llave VAPID pública.');
      }

      const applicationServerKey = this.urlB64ToUint8Array(publicKey);

      const registration = await navigator.serviceWorker.ready;
      
      // Intentar obtener una suscripción existente
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Suscribir
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey
        });
      }

      const subJson = subscription.toJSON ? subscription.toJSON() : subscription;
      await ApiService.post('/admin/push-subscribe', subJson);

      console.log('Dispositivo suscrito a Push Notifications exitosamente.');
      return true;

    } catch (err) {
      console.error('Error al suscribir el dispositivo:', err);
      return false;
    }
  }
}
