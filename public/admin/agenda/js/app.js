import Router from './router.js';
import LoginView from './views/LoginView.js';
import HomeView from './views/HomeView.js';
import CalendarView from './views/CalendarView.js';
import SettingsView from './views/SettingsView.js';
import NewCitaView from './views/NewCitaView.js';

// Define Application Routes
const routes = {
  'login': LoginView,
  'home': HomeView,
  'calendar': CalendarView,
  'settings': SettingsView,
  'new-cita': NewCitaView
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
});
