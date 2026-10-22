/**
 * Casa Nei - Vista de Inicio (Solicitudes Pendientes)
 *
 * Accesibilidad para daltonismo:
 *  - Botón Aceptar: icono ✓ (check) + verde
 *  - Botón Rechazar: icono ✕ (x) + naranja-oscuro (distinto de verde por luminancia)
 *  - Íconos SVG reemplazan emojis para consistencia Android/iOS/Web
 *
 * @module views/HomeView
 */

import ApiService from '../services/api.js';
import Modal from '../services/modal.js';
import {
  iconCheckCircleFill,
  iconXCircleFill,
  iconPlusCircleFill,
  iconCardChecklist,
  iconChatDotsFill
} from '../icons.js';

/**
 * Vista principal que muestra las solicitudes de citas pendientes de confirmación.
 * Permite aceptar o rechazar cada solicitud directamente desde el listado.
 */
export default class HomeView {
  /**
   * Renderiza el markup HTML estructural de la vista de solicitudes.
   *
   * @returns {string} Markup HTML
   */
  render() {
    return `
      <div class="fade-in">
        <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <div>
            <h1 style="font-size: 1.8rem;">Solicitudes</h1>
            <p style="color: var(--text-muted); font-size: 0.9rem;">Gestiona las citas pendientes</p>
          </div>
          <button class="btn btn-add" onclick="window.location.hash='#new-cita'" style="width: auto; padding: 10px 16px; font-size: 0.9rem; gap: 6px;">
            ${iconPlusCircleFill('icon-btn')} Nueva
          </button>
        </header>

        <div class="card" style="padding: 0; overflow: hidden;">
          <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-light); background: var(--bg-card-subtle); display: flex; align-items: center; gap: 8px;">
            ${iconCardChecklist()}
            <h3 style="font-size: 1rem; color: var(--text-main);">Pendientes de Confirmación</h3>
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

  /**
   * Monta la vista: obtiene referencia al contenedor y carga solicitudes.
   *
   * @returns {Promise<void>}
   */
  async mount() {
    this.container = document.getElementById('solicitudes-container');
    await this.loadSolicitudes();
  }

  /**
   * Carga la lista de solicitudes pendientes desde la API.
   * Incluye cache: 'no-store' via ApiService para evitar caché móvil agresivo.
   *
   * @returns {Promise<void>}
   */
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

  /**
   * Renderiza el listado de solicitudes pendientes.
   * Los botones incluyen iconos SVG como diferenciador primario para daltonismo.
   *
   * @param {Array<Object>} solicitudes - Lista de solicitudes de citas
   */
  renderList(solicitudes) {
    if (solicitudes.length === 0) {
      this.container.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 40px 20px;">
          <div style="font-size: 2.5rem; margin-bottom: 12px; opacity: 0.5;">${iconCardChecklist()}</div>
          <p>No hay solicitudes pendientes en este momento.</p>
        </div>
      `;
      return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 16px;">';
    solicitudes.forEach(cita => {
      // Indicador de WhatsApp con icono SVG en lugar de emoji 🟢
      const whatsappIndicator = cita.tiene_whatsapp
        ? `<span style="color: #16a34a; display: inline-flex; align-items: center; gap: 4px;">${iconChatDotsFill()} WhatsApp</span>`
        : '';

      html += `
        <div style="border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 16px; background: var(--bg-card-subtle);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <div>
              <h4 style="font-size: 1.1rem; color: var(--text-main); margin-bottom: 4px;">${cita.cliente_nombre}</h4>
              <p style="font-size: 0.85rem; color: var(--primary); font-weight: 600;">${cita.servicio_nombre}</p>
            </div>
            <div style="text-align: right; font-size: 0.85rem; color: var(--text-muted);">
              <div>${iconCardChecklist()} ${cita.fecha_cita}</div>
              <div style="margin-top: 2px;">🕒 ${cita.hora_inicio.substring(0, 5)}</div>
            </div>
          </div>
          
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
            <p><strong>Teléfono:</strong> ${cita.cliente_telefono || 'No proporcionado'} ${whatsappIndicator}</p>
            ${cita.notas_cliente ? `<p style="margin-top: 4px;"><strong>Notas:</strong> ${cita.notas_cliente}</p>` : ''}
          </div>

          <div style="display: flex; gap: 10px;">
            <button class="btn btn-accept" data-id="${cita.cita_id}" style="flex: 1; padding: 10px; font-size: 0.9rem;">
              ${iconCheckCircleFill('icon-btn')} Aceptar
            </button>
            <button class="btn btn-reject" data-id="${cita.cita_id}" style="flex: 1; padding: 10px; font-size: 0.9rem;">
              ${iconXCircleFill('icon-btn')} Rechazar
            </button>
          </div>
        </div>
      `;
    });
    html += '</div>';

    this.container.innerHTML = html;

    // Asignar eventos de aceptar y rechazar
    this.container.querySelectorAll('.btn-accept').forEach(btn => {
      btn.addEventListener('click', () => this.handleAccept(btn.dataset.id));
    });

    this.container.querySelectorAll('.btn-reject').forEach(btn => {
      btn.addEventListener('click', () => this.handleReject(btn.dataset.id));
    });
  }

  /**
   * Maneja la acción de aceptar una solicitud de cita.
   * Muestra modal táctil para mensaje opcional y llama a la API de confirmación.
   *
   * @param {string} citaId - ID de la cita a confirmar
   * @returns {Promise<void>}
   */
  async handleAccept(citaId) {
    const msg = await Modal.prompt({
      title: 'Confirmar Solicitud',
      message: '¿Deseas agregar algún mensaje o indicación al paciente al confirmar? (Opcional)',
      placeholder: 'Ej. Por favor acudir con 10 minutos de anticipación...',
      confirmText: 'Confirmar Cita',
      confirmType: 'accept',
      isTextarea: true
    });
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
      await Modal.alert({
        title: 'Error al confirmar',
        message: error.message,
        type: 'error'
      });
      await this.loadSolicitudes();
    }
  }

  /**
   * Maneja la acción de rechazar una solicitud de cita.
   * Muestra modal táctil para motivo opcional y llama a la API de cancelación.
   *
   * @param {string} citaId - ID de la cita a rechazar
   * @returns {Promise<void>}
   */
  async handleReject(citaId) {
    const motivo = await Modal.prompt({
      title: 'Rechazar Solicitud',
      message: 'Motivo del rechazo o cancelación (Opcional):',
      placeholder: 'Ej. Horario no disponible, terapeuta en descanso...',
      confirmText: 'Rechazar Cita',
      confirmType: 'reject',
      isTextarea: true
    });
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
      await Modal.alert({
        title: 'Error al cancelar',
        message: error.message,
        type: 'error'
      });
      await this.loadSolicitudes();
    }
  }
}
