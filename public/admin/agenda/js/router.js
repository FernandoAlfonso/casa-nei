export default class Router {
  constructor(routes, appRootId = 'app-root') {
    this.routes = routes;
    this.appRoot = document.getElementById(appRootId);
    
    // Bind current view reference
    this.currentView = null;
    
    // Listen to hash changes
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  init() {
    // Check initial route, fallback to default or home
    if (!window.location.hash) {
      window.location.hash = '#home';
    } else {
      this.handleRoute();
    }
  }

  async handleRoute() {
    const rawHash = window.location.hash.substring(1) || 'home';
    const [path, queryString] = rawHash.split('?');
    
    // Parse query string into an object
    const queryParams = {};
    if (queryString) {
      const urlParams = new URLSearchParams(queryString);
      for (const [key, value] of urlParams.entries()) {
        queryParams[key] = value;
      }
    }

    const viewClass = this.routes[path] || this.routes['home'];

    // Unmount current view if it has cleanup logic
    if (this.currentView && typeof this.currentView.unmount === 'function') {
      this.currentView.unmount();
    }

    // Instanciate new view
    this.currentView = new viewClass();
    
    const renderNewView = () => {
      this.appRoot.innerHTML = this.currentView.render();
      if (typeof this.currentView.mount === 'function') {
        this.currentView.mount(queryParams);
      }
      // Update Navigation UI
      this.updateNavUI(path);
    };

    // Use View Transitions API if supported for instant native feeling, else just render immediately
    if (document.startViewTransition) {
      document.startViewTransition(() => renderNewView());
    } else {
      renderNewView();
    }
  }

  updateNavUI(activeHash) {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.remove('active');
      if (el.getAttribute('href') === `#${activeHash}`) {
        el.classList.add('active');
      }
    });
  }
}
