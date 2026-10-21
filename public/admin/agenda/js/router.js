/**
 * Casa Nei - Enrutador SPA basado en Hash
 *
 * Administra la navegación y ciclo de vida de las vistas administrativas.
 * Soporta parámetros de consulta en el hash (ej. #calendar?fecha=2026-10-21)
 * y transiciones nativas mediante View Transitions API si están soportadas.
 *
 * @module router
 */

/**
 * Clase que gestiona el enrutamiento de la SPA.
 */
export default class Router {
  /**
   * Crea una instancia del enrutador.
   *
   * @param {Object<string, Function>} routes - Mapeo de rutas a clases de vista
   * @param {string} [appRootId='app-root'] - ID del elemento DOM raíz donde se renderizan las vistas
   */
  constructor(routes, appRootId = 'app-root') {
    this.routes = routes;
    this.appRoot = document.getElementById(appRootId);
    
    /** @type {Object|null} Referencia a la vista actualmente activa */
    this.currentView = null;
    
    // Escuchar cambios de hash en la ventana
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  /**
   * Inicializa el enrutador resolviendo la ruta inicial o cayendo a #home.
   */
  init() {
    if (!window.location.hash) {
      window.location.hash = '#home';
    } else {
      this.handleRoute();
    }
  }

  /**
   * Maneja el cambio de ruta actualizando el DOM y montando la nueva vista.
   *
   * @returns {Promise<void>}
   */
  async handleRoute() {
    const rawHash = window.location.hash.substring(1) || 'home';
    const [path, queryString] = rawHash.split('?');
    
    // Parsear parámetros de consulta a objeto clave-valor
    const queryParams = {};
    if (queryString) {
      const urlParams = new URLSearchParams(queryString);
      for (const [key, value] of urlParams.entries()) {
        queryParams[key] = value;
      }
    }

    const viewClass = this.routes[path] || this.routes['home'];

    // Desmontar vista actual si cuenta con lógica de limpieza
    if (this.currentView && typeof this.currentView.unmount === 'function') {
      this.currentView.unmount();
    }

    // Instanciar nueva vista
    this.currentView = new viewClass();
    
    const renderNewView = () => {
      this.appRoot.innerHTML = this.currentView.render();
      if (typeof this.currentView.mount === 'function') {
        this.currentView.mount(queryParams);
      }
      // Actualizar UI de navegación
      this.updateNavUI(path);
    };

    // Usar View Transitions API si está soportada en el navegador
    if (document.startViewTransition) {
      document.startViewTransition(() => renderNewView());
    } else {
      renderNewView();
    }
  }

  /**
   * Actualiza el estado activo de los enlaces en la barra de navegación.
   *
   * @param {string} activeHash - La ruta actual activa
   */
  updateNavUI(activeHash) {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.remove('active');
      if (el.getAttribute('href') === `#${activeHash}`) {
        el.classList.add('active');
      }
    });
  }
}
