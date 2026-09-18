export default class LoginView {
  render() {
    return `
      <div class="fade-in" style="max-width: 400px; margin: 0 auto; margin-top: 10vh; text-align: center;">
        <div class="icon-wrapper" style="width: 80px; height: 80px; margin: 0 auto 24px; font-size: 2.2rem; border-radius: 50%; background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(27, 56, 25, 0.6)); border: 2px solid var(--border); display: flex; align-items: center; justify-content: center;">
          🔐
        </div>
        <h1 style="margin-bottom: 8px;">Acceso Admin</h1>
        <p style="color: var(--text-muted); margin-bottom: 32px;">Introduce tu contraseña para continuar</p>
        
        <div class="card" style="text-align: left;">
          <form id="loginForm">
            <div class="form-group">
              <label class="form-label">Contraseña de Administrador</label>
              <input type="password" id="password" class="form-input" placeholder="••••••••" required>
            </div>
            <button type="submit" class="btn">Ingresar</button>
          </form>
        </div>
      </div>
    `;
  }

  mount() {
    const form = document.getElementById('loginForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      // Placeholder for future logic
      console.log('Intento de login');
      // Simulamos auth
      localStorage.setItem('admin_token', 'demo-token');
      window.location.hash = '#home';
    });
  }
}
