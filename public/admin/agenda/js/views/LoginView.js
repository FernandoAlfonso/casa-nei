import ApiService from '../services/api.js';
import PushService from '../services/push.js';

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
            <div id="loginError" style="display: none; color: var(--danger); background: var(--danger-glow); padding: 12px; border-radius: var(--radius-sm); font-size: 0.85rem; margin-bottom: 16px; border: 1px solid rgba(239, 68, 68, 0.3);"></div>
            <div class="form-group">
              <label class="form-label">Contraseña de Administrador</label>
              <input type="password" id="password" class="form-input" placeholder="••••••••" autocomplete="current-password" required>
            </div>
            <button type="submit" id="btnSubmit" class="btn">Ingresar</button>
          </form>
        </div>
      </div>
    `;
  }

  mount() {
    const form = document.getElementById('loginForm');
    const errorDiv = document.getElementById('loginError');
    const btnSubmit = document.getElementById('btnSubmit');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const password = document.getElementById('password').value;
      
      errorDiv.style.display = 'none';
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = 'Verificando...';

      try {
        const response = await fetch(`${ApiService.getApiBase()}/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || data.message || 'Contraseña incorrecta');
        }

        // Store token
        localStorage.setItem('admin_token', data.data.token);
        
        // Attempt Push Subscription
        btnSubmit.innerHTML = 'Conectando notificaciones...';
        await PushService.subscribeDevice();

        // Redirect to Home
        window.location.hash = '#home';

      } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = 'Ingresar';
      }
    });
  }
}

