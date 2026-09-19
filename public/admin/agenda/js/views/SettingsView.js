export default class SettingsView {
  render() {
    return `
      <div class="fade-in">
        <header style="margin-bottom: 24px;">
          <h1 style="font-size: 1.8rem;">Ajustes</h1>
          <p style="color: var(--text-muted); font-size: 0.9rem;">Configuración de la Agenda</p>
        </header>

        <div class="card" style="padding: 0; overflow: hidden; margin-bottom: 16px;">
          <div onclick="window.location.hash='#settings/servicios'" style="padding: 16px 20px; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: background 0.2s;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 1.4rem;">💆‍♀️</span>
              <span style="font-weight: 600;">Servicios</span>
            </div>
            <span style="color: var(--text-muted);">›</span>
          </div>
          <div onclick="window.location.hash='#settings/horarios'" style="padding: 16px 20px; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: background 0.2s;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 1.4rem;">🕒</span>
              <span style="font-weight: 600;">Horarios de Atención</span>
            </div>
            <span style="color: var(--text-muted);">›</span>
          </div>
          <div onclick="window.location.hash='#settings/bloqueos'" style="padding: 16px 20px; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: background 0.2s;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 1.4rem;">🏖️</span>
              <span style="font-weight: 600;">Bloqueos y Vacaciones</span>
            </div>
            <span style="color: var(--text-muted);">›</span>
          </div>
          <div style="padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; opacity: 0.5;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 1.4rem;">👥</span>
              <span style="font-weight: 600;">Directorio de Clientes (Pronto)</span>
            </div>
            <span style="color: var(--text-muted);">›</span>
          </div>
        </div>

        <button id="btnLogout" class="btn btn-secondary" style="color: var(--danger); border-color: rgba(239, 68, 68, 0.3);">
          Cerrar Sesión
        </button>
      </div>
    `;
  }

  mount() {
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        localStorage.removeItem('admin_token');
        window.location.hash = '#login';
      });
    }
  }
}
