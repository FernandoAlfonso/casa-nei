import Router from './router.js';
import LoginView from './views/LoginView.js';
import HomeView from './views/HomeView.js';
import CalendarView from './views/CalendarView.js';
import SettingsView from './views/SettingsView.js';
import NewCitaView from './views/NewCitaView.js';
import PushService from './services/push.js';
import SolicitudDetalleView from './views/SolicitudDetalleView.js';

import ServicesView from './views/config/ServicesView.js';
import HorariosView from './views/config/HorariosView.js';
import BloqueosView from './views/config/BloqueosView.js';

// Define Application Routes
const routes = {
  'login': LoginView,
  'home': HomeView,
  'calendar': CalendarView,
  'settings': SettingsView,
  'new-cita': NewCitaView,
  'solicitud': SolicitudDetalleView,
  'settings/servicios': ServicesView,
  'settings/horarios': HorariosView,
  'settings/bloqueos': BloqueosView
};

// Application Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  const router = new Router(routes, 'app-root');

  // Guard routing to enforce authentication
  const originalHandleRoute = router.handleRoute.bind(router);
  
  router.handleRoute = async () => {
    const rawHash = window.location.hash.substring(1) || 'home';
    const path = rawHash.split('?')[0];
    const token = localStorage.getItem('admin_token');
    const mainNav = document.getElementById('mainNav');
    const topNav = document.getElementById('topNav');

    // Protect all routes except login
    if (!token && path !== 'login') {
      window.location.hash = '#login';
      return;
    }

    // Toggle Navigation visibility
    if (path === 'login') {
      mainNav.classList.add('hidden');
      topNav.classList.add('hidden');
    } else {
      mainNav.classList.remove('hidden');
      if (window.innerWidth < 768) {
        topNav.classList.remove('hidden');
      }
    }

    // Proceed with original routing
    await originalHandleRoute();
  };

  // Verificar si venimos de un tap de notificación en iOS Web Push
  const urlParams = new URLSearchParams(window.location.search);
  const targetCitaId = urlParams.get('target_cita');
  if (targetCitaId) {
    // Reemplazar la URL base eliminando el query param y colocando el hash
    window.history.replaceState({}, document.title, window.location.pathname);
    window.location.hash = `#solicitud?id=${targetCitaId}`;
  }

  // Initialize Router
  router.init();

  // Escuchar mensajes del Service Worker para navegar cuando la app está en segundo plano (Especial para iOS)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'NAVIGATE') {
        const urlObj = new URL(event.data.url, window.location.origin);
        // Si tiene el query param target_cita, lo procesamos
        const targetId = urlObj.searchParams.get('target_cita');
        if (targetId) {
          window.location.hash = `#solicitud?id=${targetId}`;
        } else if (urlObj.hash) {
          window.location.hash = urlObj.hash;
        }
      }
    });

    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then(registration => {
        console.log('Service Worker registrado con éxito:', registration.scope);
      })
      .catch(error => {
        console.error('Error al registrar Service Worker:', error);
      });
  }

  // Attempt silent push subscription if user is already logged in
  if (localStorage.getItem('admin_token') && 'Notification' in window && Notification.permission === 'granted') {
    PushService.subscribeDevice().catch(e => console.error("Auto-subscribe failed:", e));
  }

  // Autosize textareas globally with debounce to avoid main thread blocking
  let debounceTimer;
  document.addEventListener('input', (e) => {
    if (e.target.tagName && e.target.tagName.toLowerCase() === 'textarea') {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
      }, 50); // 50ms debounce
    }
  }, false);
});
