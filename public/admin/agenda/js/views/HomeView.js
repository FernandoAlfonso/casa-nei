import ApiService from '../services/api.js';

export default class HomeView {
  render() {
    return `
      <div class="fade-in">
        <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <div>
            <h1 style="font-size: 1.8rem;">Solicitudes</h1>
            <p style="color: var(--text-muted); font-size: 0.9rem;">Gestiona las citas pendientes</p>
          </div>
          <button class="btn" onclick="window.location.hash='#new-cita'" style="width: auto; padding: 10px 16px; font-size: 0.9rem; gap: 6px;">
            <span>➕</span> Nueva
          </button>
        </header>

        <div class="card" style="padding: 0; overflow: hidden;">
          <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-light); background: rgba(0,0,0,0.2);">
            <h3 style="font-size: 1rem; color: #fff;">Pendientes de Confirmación</h3>
          </div>
          
          <div id="solicitudes-container" style="padding: 16px;">
            <div style="text-align: center; color: var(--text-muted); padding: 40px 20px;">
              <div class="spinner" style="margin: 0 auto 16px;"></div>
              Cargando solicitudes...
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async mount() {
    this.container = document.getElementById('solicitudes-container');
    await this.loadSolicitudes();
  }

  async loadSolicitudes() {
    try {
      const response = await ApiService.get('/admin/solicitudes');
      const solicitudes = response.data || [];
      this.renderList(solicitudes);
    } catch (error) {
      this.container.innerHTML = `
        <div style="text-align: center; color: var(--danger); padding: 40px 20px;">
          <p>Error al cargar solicitudes: ${error.message}</p>
        </div>
      `;
    }
  }

  renderList(solicitudes) {
    if (solicitudes.length === 0) {
      this.container.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 40px 20px;">
          <div style="font-size: 2.5rem; margin-bottom: 12px; opacity: 0.5;">🧘‍♂️</div>
          <p>No hay solicitudes pendientes en este momento.</p>
        </div>
      `;
      return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 16px;">';
    solicitudes.forEach(cita => {
      html += `
        <div style="border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 16px; background: rgba(255,255,255,0.03);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <div>
              <h4 style="font-size: 1.1rem; color: #fff; margin-bottom: 4px;">${cita.cliente_nombre}</h4>
              <p style="font-size: 0.85rem; color: var(--primary);">${cita.servicio_nombre}</p>
            </div>
            <div style="text-align: right; font-size: 0.85rem; color: var(--text-muted);">
              <div>📅 ${cita.fecha_cita}</div>
              <div>🕒 ${cita.hora_inicio.substring(0, 5)}</div>
            </div>
          </div>
          
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
            <p><strong>Teléfono:</strong> ${cita.cliente_telefono || 'No proporcionado'} ${cita.tiene_whatsapp ? '🟢 (WhatsApp)' : ''}</p>
            ${cita.notas_cliente ? `<p style="margin-top: 4px;"><strong>Notas:</strong> ${cita.notas_cliente}</p>` : ''}
          </div>

          <div style="display: flex; gap: 10px;">
            <button class="btn btn-accept" data-id="${cita.id}" style="flex: 1; padding: 10px; font-size: 0.9rem;">✅ Aceptar</button>
            <button class="btn btn-secondary btn-reject" data-id="${cita.id}" style="flex: 1; padding: 10px; font-size: 0.9rem; color: var(--danger); border-color: rgba(239, 68, 68, 0.3);">❌ Rechazar</button>
          </div>
        </div>
      `;
    });
    html += '</div>';

    this.container.innerHTML = html;

    // Attach events
    this.container.querySelectorAll('.btn-accept').forEach(btn => {
      btn.addEventListener('click', () => this.handleAccept(btn.dataset.id));
    });

    this.container.querySelectorAll('.btn-reject').forEach(btn => {
      btn.addEventListener('click', () => this.handleReject(btn.dataset.id));
    });
  }

  async handleAccept(citaId) {
    const msg = prompt("¿Deseas agregar algún mensaje o indicación al paciente al confirmar? (Opcional)");
    if (msg === null) return; // Cancelado

    try {
      const btn = this.container.querySelector(`.btn-accept[data-id="${citaId}"]`);
      btn.disabled = true;
      btn.innerHTML = 'Procesando...';

      const res = await ApiService.post('/admin/citas/confirmar', {
        cita_id: citaId,
        mensaje_admin: msg
      });

      if (res.data && res.data.whatsapp_url) {
        window.open(res.data.whatsapp_url, '_blank');
      }

      await this.loadSolicitudes();
    } catch (error) {
      alert("Error al confirmar: " + error.message);
      await this.loadSolicitudes();
    }
  }

  async handleReject(citaId) {
    const motivo = prompt("Motivo del rechazo / cancelación (Opcional):");
    if (motivo === null) return; // Cancelado

    try {
      const btn = this.container.querySelector(`.btn-reject[data-id="${citaId}"]`);
      btn.disabled = true;
      btn.innerHTML = 'Procesando...';

      const res = await ApiService.post('/admin/citas/cancelar', {
        cita_id: citaId,
        motivo: motivo
      });

      if (res.data && res.data.whatsapp_url) {
        window.open(res.data.whatsapp_url, '_blank');
      }

      await this.loadSolicitudes();
    } catch (error) {
      alert("Error al cancelar: " + error.message);
      await this.loadSolicitudes();
    }
  }
}
