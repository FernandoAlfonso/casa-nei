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
    const hash = window.location.hash.substring(1) || 'home';
    const viewClass = this.routes[hash] || this.routes['home'];

    // Unmount current view if it has cleanup logic
    if (this.currentView && typeof this.currentView.unmount === 'function') {
      this.currentView.unmount();
    }

    // Instanciate new view
    this.currentView = new viewClass();
    
    // Fade out current content
    this.appRoot.style.opacity = '0';
    
    // Tiny delay for fade effect
    await new Promise(r => setTimeout(r, 150));
    
    // Render and mount new content
    this.appRoot.innerHTML = this.currentView.render();
    if (typeof this.currentView.mount === 'function') {
      this.currentView.mount();
    }
    
    // Fade in
    this.appRoot.style.transition = 'opacity 0.2s ease-in-out';
    this.appRoot.style.opacity = '1';

    // Update Navigation UI
    this.updateNavUI(hash);
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
