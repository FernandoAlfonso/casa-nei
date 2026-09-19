import ApiService from '../services/api.js';

export default class NewCitaView {
  render() {
    return `
      <div class="fade-in">
        <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <div>
            <h1 style="font-size: 1.8rem;">Nueva Cita</h1>
            <p style="color: var(--text-muted); font-size: 0.9rem;">Agendar directamente (Admin)</p>
          </div>
          <button class="btn btn-secondary" onclick="window.location.hash='#home'" style="width: auto; padding: 10px 16px;">
            Cancelar
          </button>
        </header>

        <div class="card">
          <form id="newCitaForm">
            <div id="formError" style="display: none; color: var(--danger); background: var(--danger-glow); padding: 12px; border-radius: var(--radius-sm); font-size: 0.85rem; margin-bottom: 16px; border: 1px solid rgba(239, 68, 68, 0.3);"></div>
            
            <div class="form-group">
              <label class="form-label">Nombre del Paciente <span style="color: var(--danger);">*</span></label>
              <input type="text" id="nc_nombre" class="form-input" required>
            </div>

            <div class="form-group">
              <label class="form-label">Teléfono (WhatsApp)</label>
              <input type="tel" id="nc_telefono" class="form-input" placeholder="Ej. 3121234567">
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">Opcional. Necesario si deseas notificarle por WhatsApp.</div>
            </div>

            <div class="form-group">
              <label class="form-label">Servicio <span style="color: var(--danger);">*</span></label>
              <select id="nc_servicio" class="form-input" required>
                <option value="">Cargando servicios...</option>
              </select>
            </div>

            <div style="display: flex; gap: 16px;">
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Fecha <span style="color: var(--danger);">*</span></label>
                <input type="date" id="nc_fecha" class="form-input" required>
              </div>
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Hora Inicio <span style="color: var(--danger);">*</span></label>
                <input type="time" id="nc_hora" class="form-input" required>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Notas Internas</label>
              <textarea id="nc_notas" class="form-input" rows="2" placeholder="Motivo de consulta o comentarios extra"></textarea>
            </div>

            <div class="form-group" style="display: flex; align-items: center; gap: 8px; margin-bottom: 24px;">
              <input type="checkbox" id="nc_confirmar" style="width: 20px; height: 20px;">
              <label for="nc_confirmar" style="font-size: 0.9rem;">Confirmar cita inmediatamente</label>
            </div>

            <button type="submit" id="btnSubmitNC" class="btn">Agendar Cita</button>
          </form>
        </div>
      </div>
    `;
  }

  async mount() {
    this.form = document.getElementById('newCitaForm');
    this.errorDiv = document.getElementById('formError');
    this.btnSubmit = document.getElementById('btnSubmitNC');
    this.selectServicio = document.getElementById('nc_servicio');

    await this.loadServicios();

    this.form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmit();
    });
  }

  async loadServicios() {
    try {
      // El endpoint público de servicios para llenar el catálogo
      const response = await fetch('/api/servicios');
      const data = await response.json();
      
      this.selectServicio.innerHTML = '<option value="">Selecciona un servicio</option>';
      data.data.forEach(s => {
        const option = document.createElement('option');
        option.value = s.id;
        option.textContent = `${s.nombre} (${s.duracion_minutos} min)`;
        this.selectServicio.appendChild(option);
      });
    } catch (error) {
      this.selectServicio.innerHTML = '<option value="">Error al cargar servicios</option>';
    }
  }

  async handleSubmit() {
    const payload = {
      nombre_completo: document.getElementById('nc_nombre').value,
      telefono: document.getElementById('nc_telefono').value || null,
      servicio_id: parseInt(document.getElementById('nc_servicio').value, 10),
      fecha_cita: document.getElementById('nc_fecha').value,
      hora_inicio: document.getElementById('nc_hora').value,
      notas_admin: document.getElementById('nc_notas').value || null,
      confirmar_inmediatamente: document.getElementById('nc_confirmar').checked,
      canal: 'admin'
    };

    this.errorDiv.style.display = 'none';
    this.btnSubmit.disabled = true;
    this.btnSubmit.innerHTML = 'Agendando...';

    try {
      const response = await ApiService.post('/admin/citas', payload);

      if (response.data && response.data.whatsapp_url) {
        window.open(response.data.whatsapp_url, '_blank');
      }

      // Regresar al Home
      window.location.hash = '#home';

    } catch (error) {
      this.errorDiv.textContent = error.message;
      this.errorDiv.style.display = 'block';
      this.btnSubmit.disabled = false;
      this.btnSubmit.innerHTML = 'Agendar Cita';
      // Smooth scroll up to see error
      this.errorDiv.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
