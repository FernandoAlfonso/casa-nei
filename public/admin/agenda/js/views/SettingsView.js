/**
 * Casa Nei - Vista de Ajustes (Settings)
 *
 * Accesibilidad para daltonismo:
 *  - Iconos SVG reemplazan emojis para consistencia Android/iOS/Web
 *  - Estado de notificaciones usa texto + icono (no solo color)
 *  - Botón "Cerrar Sesión" usa icono de eliminar (naranja-oscuro)
 *
 * @module views/SettingsView
 */

import Modal from '../services/modal.js';
import {
  iconBellFill,
  iconStarFill,
  iconClockFill,
  iconLockFill,
  iconPeopleFill,
  iconCheckCircleFill,
  iconXCircleFill,
  iconTrashFill
} from '../icons.js';

/**
 * Vista de ajustes del panel de administración.
 * Permite configurar notificaciones push y acceder a sub-secciones de configuración.
 */
export default class SettingsView {
  /**
   * Renderiza el markup HTML de la vista de ajustes.
   * Los iconos SVG reemplazan emojis para garantizar consistencia visual.
   *
   * @returns {string} Markup HTML
   */
  render() {
    return `
      <div class="fade-in">
        <header style="margin-bottom: 24px;">
          <h1 style="font-size: 1.8rem;">Ajustes</h1>
          <p style="color: var(--text-muted); font-size: 0.9rem;">Configuración de la Agenda</p>
        </header>

        <div class="card" style="padding: 0; overflow: hidden; margin-bottom: 16px;">
          <!-- Notificaciones Push -->
          <div id="btnPush" style="padding: 16px 20px; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: background 0.2s;" role="button" tabindex="0" aria-label="Configurar notificaciones push">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 1.4rem; color: var(--text-muted); display: flex;">${iconBellFill()}</span>
              <span style="font-weight: 600;" id="pushStatusText">Activar Notificaciones Push</span>
            </div>
            <span style="color: var(--text-muted);">›</span>
          </div>

          <!-- Servicios -->
          <div onclick="window.location.hash='#settings/servicios'" style="padding: 16px 20px; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: background 0.2s;" role="button" tabindex="0" aria-label="Configurar servicios">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 1.4rem; color: var(--text-muted); display: flex;">${iconStarFill()}</span>
              <span style="font-weight: 600;">Servicios</span>
            </div>
            <span style="color: var(--text-muted);">›</span>
          </div>

          <!-- Horarios -->
          <div onclick="window.location.hash='#settings/horarios'" style="padding: 16px 20px; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: background 0.2s;" role="button" tabindex="0" aria-label="Configurar horarios de atención">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 1.4rem; color: var(--text-muted); display: flex;">${iconClockFill()}</span>
              <span style="font-weight: 600;">Horarios de Atención</span>
            </div>
            <span style="color: var(--text-muted);">›</span>
          </div>

          <!-- Bloqueos -->
          <div onclick="window.location.hash='#settings/bloqueos'" style="padding: 16px 20px; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: background 0.2s;" role="button" tabindex="0" aria-label="Configurar bloqueos y vacaciones">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 1.4rem; color: var(--text-muted); display: flex;">${iconLockFill()}</span>
              <span style="font-weight: 600;">Bloqueos y Vacaciones</span>
            </div>
            <span style="color: var(--text-muted);">›</span>
          </div>

          <!-- Directorio (Próximamente) -->
          <div style="padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; opacity: 0.5;" aria-disabled="true">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 1.4rem; color: var(--text-muted); display: flex;">${iconPeopleFill()}</span>
              <span style="font-weight: 600;">Directorio de Clientes (Pronto)</span>
            </div>
            <span style="color: var(--text-muted);">›</span>
          </div>
        </div>

        <button id="btnLogout" class="btn btn-delete">
          ${iconTrashFill('icon-btn')} Cerrar Sesión
        </button>
      </div>
    `;
  }

  /**
   * Monta la vista: asigna eventos de logout y configuración de push notifications.
   */
  mount() {
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        localStorage.removeItem('admin_token');
        window.location.hash = '#login';
      });
    }

    const btnPush = document.getElementById('btnPush');
    const pushStatusText = document.getElementById('pushStatusText');
    
    if (btnPush) {
      // Establecer estado inicial de notificaciones con icono SVG
      if ('Notification' in window && Notification.permission === 'granted') {
        pushStatusText.innerHTML = `Notificaciones Activas ${iconCheckCircleFill()}`;
        pushStatusText.style.color = 'var(--primary)';
      }

      /**
       * Handler del clic en el botón de push.
       * Importa PushService dinámicamente y solicita suscripción.
       */
      btnPush.addEventListener('click', async () => {
        pushStatusText.textContent = 'Configurando...';
        
        import('../services/push.js').then(async (module) => {
          const PushService = module.default;
          const success = await PushService.subscribeDevice();
          if (success) {
            pushStatusText.innerHTML = `Notificaciones Activas ${iconCheckCircleFill()}`;
            pushStatusText.style.color = 'var(--primary)';
            await Modal.alert({
              title: 'Notificaciones Activas',
              message: '¡Notificaciones Push habilitadas correctamente en este dispositivo!',
              type: 'success'
            });
          } else {
            pushStatusText.innerHTML = `Permiso denegado ${iconXCircleFill()}`;
            pushStatusText.style.color = 'var(--btn-orange-bg)';
            await Modal.alert({
              title: 'Permiso denegado',
              message: 'No se pudo activar: Permiso denegado o Web Push no soportado en este navegador.',
              type: 'warning'
            });
          }
        }).catch(async (err) => {
          console.error(err);
          pushStatusText.innerHTML = `Error al activar ${iconXCircleFill()}`;
          pushStatusText.style.color = 'var(--btn-orange-bg)';
          await Modal.alert({
            title: 'Error al activar',
            message: `Error al activar notificaciones: ${err.message}`,
            type: 'error'
          });
        });
      });

      // Permitir activación con teclado (accesibilidad)
      btnPush.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          btnPush.click();
        }
      });
    }
  }
}
