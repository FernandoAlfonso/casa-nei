import ApiService from '../../services/api.js';

export default class BloqueosView {
  render() {
    return `
      <div class="fade-in">
        <header style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <button onclick="window.location.hash='#settings'" class="btn btn-secondary" style="padding: 4px 12px; margin-bottom: 8px;">&larr; Volver</button>
            <h1 style="font-size: 1.6rem;">Bloqueos</h1>
            <p style="color: var(--text-muted); font-size: 0.9rem;">Festivos y ausencias</p>
          </div>
          <button class="btn" id="btnNuevoBloqueo" style="width: auto; padding: 10px 16px;">
            ➕ Nuevo
          </button>
        </header>

        <div id="bloqueosList" style="display: flex; flex-direction: column; gap: 12px;">
          <div class="spinner" style="margin: 0 auto;"></div>
        </div>
      </div>
    `;
  }

  async mount() {
    this.container = document.getElementById('bloqueosList');
    this.btnNuevo = document.getElementById('btnNuevoBloqueo');

    this.btnNuevo.addEventListener('click', () => this.abrirModal());

    await this.loadBloqueos();
  }

  async loadBloqueos() {
    try {
      const response = await ApiService.get('/admin/config/bloqueos');
      const bloqueos = response.data || [];
      
      if (bloqueos.length === 0) {
        this.container.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No hay bloqueos activos ni futuros.</p>';
        return;
      }

      let html = '';
      bloqueos.forEach(b => {
        html += `
          <div class="card" style="padding: 16px; display: flex; justify-content: space-between; align-items: center; border-left: 3px solid var(--danger);">
            <div>
              <h3 style="font-size: 1.1rem;">${b.fecha}</h3>
              <p style="font-size: 0.85rem; color: var(--text-muted);">${b.es_dia_completo ? 'Día completo' : b.hora_inicio + ' - ' + b.hora_fin}</p>
              ${b.motivo ? `<p style="font-size: 0.85rem; color: #fff; margin-top: 4px;">Motivo: ${b.motivo}</p>` : ''}
            </div>
            <button class="btn btn-secondary btn-del" data-id="${b.id}" style="width: auto; padding: 8px 12px; color: var(--danger); border-color: rgba(239, 68, 68, 0.3);">🗑️</button>
          </div>
        `;
      });
      this.container.innerHTML = html;

      this.container.querySelectorAll('.btn-del').forEach(btn => {
        btn.addEventListener('click', (e) => this.eliminarBloqueo(e.target.dataset.id));
      });
    } catch (error) {
      this.container.innerHTML = `<p style="color: var(--danger);">Error: ${error.message}</p>`;
    }
  }

  async eliminarBloqueo(id) {
    if (!confirm('¿Seguro que deseas eliminar este bloqueo?')) return;
    try {
      await ApiService.post('/admin/config/bloqueos/eliminar', { id });
      await this.loadBloqueos();
    } catch (error) {
      alert("Error al eliminar: " + error.message);
    }
  }

  abrirModal() {
    const overlay = document.createElement('div');
    overlay.style = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px;';
    
    overlay.innerHTML = `
      <div class="card" style="width: 100%; max-width: 400px; padding: 24px;">
        <h3 style="margin-bottom: 16px;">Nuevo Bloqueo (Día completo)</h3>
        <form id="bloqueoForm">
          <div class="form-group">
            <label class="form-label">Fecha a bloquear</label>
            <input type="date" id="bl_fecha" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label">Motivo (Opcional)</label>
            <input type="text" id="bl_motivo" class="form-input" placeholder="Vacaciones, Festivo, Enfermedad...">
          </div>
          <div style="display: flex; gap: 12px; margin-top: 24px;">
            <button type="button" id="btnCancelModal" class="btn btn-secondary" style="flex: 1;">Cancelar</button>
            <button type="submit" class="btn" style="flex: 1;">Guardar</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('btnCancelModal').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    document.getElementById('bloqueoForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const payload = {
        fecha: document.getElementById('bl_fecha').value,
        hora_inicio: '00:00:00',
        hora_fin: '23:59:59',
        motivo: document.getElementById('bl_motivo').value
      };

      try {
        await ApiService.post('/admin/config/bloqueos/crear', payload);
        document.body.removeChild(overlay);
        await this.loadBloqueos();
      } catch (error) {
        alert("Error al guardar: " + error.message);
      }
    });
  }
}
