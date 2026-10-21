/**
 * Casa Nei - Vista de Nueva Cita (Admin)
 *
 * Accesibilidad para daltonismo:
 *  - Asterisco de campo requerido usa clase `.required-star` (azul oscuro, no rojo)
 *  - Botón de submit usa icono SVG de check
 *  - Botón cancelar usa icono SVG de flecha
 *
 * @module views/NewCitaView
 */

import ApiService from '../services/api.js';
import { iconCheckCircleFill, iconArrowLeft } from '../icons.js';

/**
 * Vista para agendar una nueva cita directamente desde el panel de administración.
 * Carga el catálogo de servicios y envía el formulario a la API.
 */
export default class NewCitaView {
  /**
   * Renderiza el markup HTML del formulario de nueva cita.
   * Usa .required-star (azul) en lugar de color rojo para asteriscos requeridos.
   *
   * @returns {string} Markup HTML
   */
  render() {
    return `
      <div class="fade-in">
        <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <div>
            <h1 style="font-size: 1.8rem;">Nueva Cita</h1>
            <p style="color: var(--text-muted); font-size: 0.9rem;">Agendar directamente (Admin)</p>
          </div>
          <button class="btn btn-secondary" onclick="window.location.hash='#home'" style="width: auto; padding: 10px 16px;">
            ${iconArrowLeft('icon-btn')} Cancelar
          </button>
        </header>

        <div class="card">
          <form id="newCitaForm">
            <div id="formError" style="display: none; color: #1d4ed8; background: rgba(219, 234, 254, 0.6); padding: 12px; border-radius: var(--radius-sm); font-size: 0.85rem; margin-bottom: 16px; border: 1px solid rgba(59, 130, 246, 0.3);"></div>
            
            <div class="form-group">
              <label class="form-label">Nombre del Paciente <span class="required-star" aria-label="requerido">*</span></label>
              <input type="text" id="nc_nombre" class="form-input" required>
            </div>

            <div class="form-group">
              <label class="form-label">Teléfono (WhatsApp)</label>
              <input type="tel" id="nc_telefono" class="form-input" placeholder="Ej. 3121234567">
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">Opcional. Necesario si deseas notificarle por WhatsApp.</div>
            </div>

            <div class="form-group">
              <label class="form-label">Servicio <span class="required-star" aria-label="requerido">*</span></label>
              <select id="nc_servicio" class="form-input" required>
                <option value="">Cargando servicios...</option>
              </select>
            </div>

            <div style="display: flex; gap: 16px; flex-wrap: wrap;">
              <div class="form-group" style="flex: 1; min-width: 0;">
                <label class="form-label">Fecha <span class="required-star" aria-label="requerido">*</span></label>
                <input type="date" id="nc_fecha" class="form-input" required style="min-width: 0;">
              </div>
              <div class="form-group" style="flex: 1; min-width: 0;">
                <label class="form-label">Hora Inicio <span class="required-star" aria-label="requerido">*</span></label>
                <input type="time" id="nc_hora" class="form-input" required style="min-width: 0;">
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 24px;">
              <label class="form-label">Notas Internas</label>
              <textarea id="nc_notas" class="form-input" rows="2" placeholder="Motivo de consulta o comentarios extra"></textarea>
            </div>

            <button type="submit" id="btnSubmitNC" class="btn btn-add">
              ${iconCheckCircleFill('icon-btn')} Agendar Cita
            </button>
          </form>
        </div>
      </div>
    `;
  }

  /**
   * Monta la vista: aplica fecha pre-seleccionada si viene en URL, carga servicios
   * y asigna el evento de submit del formulario.
   *
   * @param {Object} [params={}] - Parámetros de la URL
   * @param {string} [params.fecha] - Fecha pre-seleccionada en formato YYYY-MM-DD
   * @returns {Promise<void>}
   */
  async mount(params = {}) {
    this.form = document.getElementById('newCitaForm');
    this.errorDiv = document.getElementById('formError');
    this.btnSubmit = document.getElementById('btnSubmitNC');
    this.selectServicio = document.getElementById('nc_servicio');

    if (params && params.fecha) {
      const inputFecha = document.getElementById('nc_fecha');
      if (inputFecha) inputFecha.value = params.fecha;
    }

    await this.loadServicios();

    this.form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmit();
    });
  }

  /**
   * Carga el catálogo de servicios desde la API pública.
   *
   * @returns {Promise<void>}
   */
  async loadServicios() {
    try {
      // El endpoint público de servicios para llenar el catálogo
      const response = await fetch(`${ApiService.getApiBase()}/servicios`);
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

  /**
   * Procesa el envío del formulario de nueva cita.
   * Valida, construye el payload y llama al endpoint de admin.
   *
   * @returns {Promise<void>}
   */
  async handleSubmit() {
    const payload = {
      nombre_completo: document.getElementById('nc_nombre').value,
      telefono: document.getElementById('nc_telefono').value || null,
      servicio_id: parseInt(document.getElementById('nc_servicio').value, 10),
      fecha_cita: document.getElementById('nc_fecha').value,
      hora_inicio: document.getElementById('nc_hora').value,
      notas_admin: document.getElementById('nc_notas').value || null,
      confirmar_inmediatamente: true,
      canal: 'admin'
    };

    this.errorDiv.style.display = 'none';
    this.btnSubmit.disabled = true;
    this.btnSubmit.innerHTML = 'Agendando...';

    try {
      const response = await ApiService.post('/admin/citas/agendar', payload);

      if (response.data && response.data.whatsapp_url) {
        window.open(response.data.whatsapp_url, '_blank');
      }

      // Redirigir al Calendario en la fecha agendada
      const fechaCita = payload.fecha_cita;
      window.location.hash = fechaCita ? `#calendar?fecha=${fechaCita}` : '#calendar';

    } catch (error) {
      this.errorDiv.textContent = error.message;
      this.errorDiv.style.display = 'block';
      this.btnSubmit.disabled = false;
      this.btnSubmit.innerHTML = `${iconCheckCircleFill('icon-btn')} Agendar Cita`;
      // Smooth scroll up to see error
      this.errorDiv.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
