import ApiService from '../services/api.js';

export default class SolicitudDetalleView {
  render() {
    return `
      <div class="fade-in">
        <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <div>
            <h1 style="font-size: 1.8rem;">Detalle de Solicitud</h1>
            <p style="color: var(--text-muted); font-size: 0.9rem;">Gestiona esta cita pendiente</p>
          </div>
          <button class="btn" onclick="window.location.hash='#home'" style="width: auto; padding: 10px 16px; font-size: 0.9rem; gap: 6px;">
            ⬅️ Volver
          </button>
        </header>

        <div class="card" style="padding: 0; overflow: hidden;">
          <div id="solicitud-detalle-container" style="padding: 16px;">
            <div style="text-align: center; color: var(--text-muted); padding: 40px 20px;">
              <div class="spinner" style="margin: 0 auto 16px;"></div>
              Cargando solicitud...
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async mount(params = {}) {
    this.container = document.getElementById('solicitud-detalle-container');
    this.citaId = parseInt(params.id, 10);
    
    if (isNaN(this.citaId)) {
      this.container.innerHTML = `
        <div style="text-align: center; color: var(--danger); padding: 40px 20px;">
          <p>ID de cita no proporcionado o inválido.</p>
        </div>
      `;
      return;
    }

    await this.loadSolicitud();
  }

  async loadSolicitud() {
    try {
      // Reutilizamos el endpoint de solicitudes ya que no hay uno individual
      const response = await ApiService.get('/admin/solicitudes');
      const solicitudes = response.data || [];
      const cita = solicitudes.find(s => s.cita_id === this.citaId);

      if (!cita) {
        this.container.innerHTML = `
          <div style="text-align: center; color: var(--text-muted); padding: 40px 20px;">
            <div style="font-size: 2.5rem; margin-bottom: 12px; opacity: 0.5;">❓</div>
            <p>La solicitud no fue encontrada. Es posible que ya haya sido procesada.</p>
          </div>
        `;
        return;
      }

      this.renderDetalle(cita);
    } catch (error) {
      this.container.innerHTML = `
        <div style="text-align: center; color: var(--danger); padding: 40px 20px;">
          <p>Error al cargar solicitud: ${error.message}</p>
        </div>
      `;
    }
  }

  renderDetalle(cita) {
    const html = `
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

        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 24px;">
          <button class="btn btn-accept" data-id="${cita.cita_id}" style="width: 100%; padding: 12px; font-size: 1rem;">✅ Aceptar Solicitud</button>
          <button class="btn btn-secondary btn-reject" data-id="${cita.cita_id}" style="width: 100%; padding: 12px; font-size: 1rem; color: var(--danger); border-color: rgba(239, 68, 68, 0.3);">❌ Rechazar Solicitud</button>
        </div>
      </div>
    `;

    this.container.innerHTML = html;

    // Attach events
    const btnAccept = this.container.querySelector('.btn-accept');
    const btnReject = this.container.querySelector('.btn-reject');

    if (btnAccept) {
      btnAccept.addEventListener('click', () => this.handleAccept(btnAccept.dataset.id, btnAccept));
    }
    
    if (btnReject) {
      btnReject.addEventListener('click', () => this.handleReject(btnReject.dataset.id, btnReject));
    }
  }

  async handleAccept(citaId, btn) {
    const msg = prompt("¿Deseas agregar algún mensaje o indicación al paciente al confirmar? (Opcional)");
    if (msg === null) return; // Cancelado

    try {
      btn.disabled = true;
      btn.innerHTML = 'Procesando...';

      const res = await ApiService.post('/admin/citas/confirmar', {
        cita_id: parseInt(citaId, 10),
        mensaje_admin: msg
      });

      if (res.data && res.data.whatsapp_url) {
        window.open(res.data.whatsapp_url, '_blank');
      }

      // Regresar al listado general después de aceptar
      window.location.hash = '#home';
    } catch (error) {
      alert("Error al confirmar: " + error.message);
      btn.disabled = false;
      btn.innerHTML = '✅ Aceptar Solicitud';
    }
  }

  async handleReject(citaId, btn) {
    const motivo = prompt("Motivo del rechazo / cancelación (Opcional):");
    if (motivo === null) return; // Cancelado

    try {
      btn.disabled = true;
      btn.innerHTML = 'Procesando...';

      const res = await ApiService.post('/admin/citas/cancelar', {
        cita_id: parseInt(citaId, 10),
        motivo: motivo
      });

      if (res.data && res.data.whatsapp_url) {
        window.open(res.data.whatsapp_url, '_blank');
      }

      // Regresar al listado general después de rechazar
      window.location.hash = '#home';
    } catch (error) {
      alert("Error al cancelar: " + error.message);
      btn.disabled = false;
      btn.innerHTML = '❌ Rechazar Solicitud';
    }
  }
}
