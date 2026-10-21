/**
 * Casa Nei - Vista de Autenticación de Administrador
 *
 * Accesibilidad para daltonismo:
 *  - Reemplazo de emojis por SVG inline de Bootstrap Icons
 *  - Estilos de alerta de error seguros con alto contraste
 *
 * @module views/LoginView
 */

import ApiService from '../services/api.js';
import PushService from '../services/push.js';
import { iconLockFill } from '../icons.js';

/**
 * Vista de inicio de sesión administrativo.
 * Solicita la contraseña maestra del panel y gestiona el token JWT.
 */
export default class LoginView {
  /**
   * Renderiza el markup HTML del formulario de acceso.
   *
   * @returns {string} Markup HTML
   */
  render() {
    return `
      <div class="fade-in" style="max-width: 400px; margin: 0 auto; margin-top: 10vh; text-align: center;">
        <div class="icon-wrapper" style="width: 80px; height: 80px; margin: 0 auto 24px; font-size: 2.2rem; border-radius: 50%; background: var(--bg-hover); border: 1.5px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--primary);" aria-hidden="true">
          ${iconLockFill()}
        </div>
        <h1 style="margin-bottom: 8px;">Acceso Admin</h1>
        <p style="color: var(--text-muted); margin-bottom: 32px;">Introduce tu contraseña para continuar</p>
        
        <div class="card" style="text-align: left;">
          <form id="loginForm">
            <div id="loginError" style="display: none; color: #1e40af; background: rgba(219, 234, 254, 0.6); padding: 12px; border-radius: var(--radius-sm); font-size: 0.85rem; margin-bottom: 16px; border: 1px solid rgba(59, 130, 246, 0.3);" role="alert"></div>
            <div class="form-group">
              <label class="form-label" for="password">Contraseña de Administrador</label>
              <input type="password" id="password" class="form-input" placeholder="••••••••" autocomplete="current-password" required>
            </div>
            <button type="submit" id="btnSubmit" class="btn">Ingresar</button>
          </form>
        </div>
      </div>
    `;
  }

  /**
   * Monta la vista y enlaza el evento submit del formulario de login.
   */
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

        // Almacenar token en localStorage
        localStorage.setItem('admin_token', data.data.token);
        
        // Intentar suscribir notificaciones push
        btnSubmit.innerHTML = 'Conectando notificaciones...';
        await PushService.subscribeDevice();

        // Redireccionar a inicio
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
