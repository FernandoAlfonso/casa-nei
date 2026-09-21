import Router from './router.js';
import LoginView from './views/LoginView.js';
import HomeView from './views/HomeView.js';
import CalendarView from './views/CalendarView.js';
import SettingsView from './views/SettingsView.js';
import NewCitaView from './views/NewCitaView.js';

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
    const hash = window.location.hash.substring(1) || 'home';
    const token = localStorage.getItem('admin_token');
    const mainNav = document.getElementById('mainNav');
    const topNav = document.getElementById('topNav');

    // Protect all routes except login
    if (!token && hash !== 'login') {
      window.location.hash = '#login';
      return;
    }

    // Toggle Navigation visibility
    if (hash === 'login') {
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

  // Initialize Router
  router.init();

  // Autosize textareas globally as user types
  document.addEventListener('input', (e) => {
    if (e.target.tagName && e.target.tagName.toLowerCase() === 'textarea') {
      e.target.style.height = 'auto';
      e.target.style.height = e.target.scrollHeight + 'px';
    }
  }, false);
});
