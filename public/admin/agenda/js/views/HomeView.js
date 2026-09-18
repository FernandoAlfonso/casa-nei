export default class HomeView {
  render() {
    return `
      <div class="fade-in">
        <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <div>
            <h1 style="font-size: 1.8rem;">Solicitudes</h1>
            <p style="color: var(--text-muted); font-size: 0.9rem;">Gestiona las citas pendientes</p>
          </div>
          <button class="btn" style="width: auto; padding: 10px 16px; font-size: 0.9rem; gap: 6px;">
            <span>➕</span> Nueva Cita
          </button>
        </header>

        <!-- Skeleton for list of pending requests -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-light); background: rgba(0,0,0,0.2);">
            <h3 style="font-size: 1rem; color: #fff;">Pendientes de Confirmación</h3>
          </div>
          
          <!-- Empty State (Placeholder) -->
          <div style="padding: 40px 20px; text-align: center; color: var(--text-muted);">
            <div style="font-size: 2.5rem; margin-bottom: 12px; opacity: 0.5;">🧘‍♂️</div>
            <p>No hay solicitudes pendientes en este momento.</p>
          </div>
        </div>
      </div>
    `;
  }
}
