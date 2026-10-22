/**
 * Casa Nei - Vista de Detalle de Cita y Solicitud
 *
 * Soporta visualización y gestión tanto de solicitudes pendientes como de citas confirmadas
 * o canceladas.
 *
 * Accesibilidad para daltonismo:
 *  - Botón Aceptar: icono ✓ (check) + verde
 *  - Botón Rechazar/Cancelar: icono ✕ (x) + naranja-oscuro
 *  - Iconos SVG en lugar de emojis para consistencia entre plataformas
 *  - Estados de citas con iconos distintivos y etiquetas semánticas
 *
 * Enfoque móvil y reglas de negocio:
 *  - Peticiones con cache: 'no-store' estricto vía ApiService.
 *  - Contenedores con flex-wrap y min-width: 0 para evitar desbordamiento horizontal.
 *
 * @module views/SolicitudDetalleView
 */

import ApiService from '../services/api.js';
import Modal from '../services/modal.js';
import {
  iconCheckCircleFill,
  iconXCircleFill,
  iconArrowLeft,
  iconChatDotsFill,
  iconCardChecklist,
  iconExclamationTriangleFill,
  iconCalendar3,
  iconClockFill
} from '../icons.js';

/**
 * Escapa caracteres HTML para prevenir inyecciones XSS.
 *
 * @param {string} text - Cadena a sanitizar
 * @returns {string} Cadena segura
 */
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Convierte un formato de hora "HH:MM[:SS]" a minutos desde la medianoche.
 *
 * @param {string} timeStr - Hora en formato HH:MM o HH:MM:SS
 * @returns {number} Minutos transcurridos en el día
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

/**
 * Determina si la cita se encuentra en curso en el instante actual.
 *
 * @param {string} fechaCita - Fecha en formato YYYY-MM-DD
 * @param {string} horaInicio - Hora de inicio HH:MM:SS
 * @param {string} horaFin - Hora de culminación HH:MM:SS
 * @returns {boolean}
 */
function isEnCurso(fechaCita, horaInicio, horaFin) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;
  if (fechaCita !== todayStr) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMin = parseTimeToMinutes(horaInicio);
  const endMin = parseTimeToMinutes(horaFin);
  return currentMinutes >= startMin && currentMinutes < endMin;
}

/**
 * Vista de detalle de una cita o solicitud específica.
 * Permite aceptar o rechazar solicitudes pendientes, o contactar y cancelar citas confirmadas.
 */
export default class SolicitudDetalleView {
  constructor() {
    /** @type {HTMLElement|null} */
    this.container = null;
    /** @type {number|null} */
    this.citaId = null;
  }

  /**
   * Renderiza el markup HTML estructural de la vista de detalle.
   *
   * @returns {string} Markup HTML
   */
  render() {
    return `
      <div class="fade-in">
        <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 12px; flex-wrap: wrap;">
          <div>
            <h1 style="font-size: 1.8rem;" id="solicitud-header-title">Detalle de Cita</h1>
            <p style="color: var(--text-muted); font-size: 0.9rem;" id="solicitud-header-subtitle">Gestiona la información de la cita</p>
          </div>
          <button class="btn btn-secondary" onclick="window.history.length > 1 ? window.history.back() : window.location.hash='#home'" style="width: auto; padding: 10px 16px; font-size: 0.9rem; gap: 6px;">
            ${iconArrowLeft('icon-btn')} Volver
          </button>
        </header>

        <div class="card" style="padding: 0; overflow: hidden;">
          <div id="solicitud-detalle-container" style="padding: 16px;">
            <div style="text-align: center; color: var(--text-muted); padding: 40px 20px;">
              <div class="spinner" style="margin: 0 auto 16px;"></div>
              Cargando información...
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Monta la vista: extrae el ID de la cita de los params y carga el detalle.
   *
   * @param {Object} [params={}] - Parámetros de la URL
   * @param {string} [params.id] - ID de la cita
   * @returns {Promise<void>}
   */
  async mount(params = {}) {
    this.container = document.getElementById('solicitud-detalle-container');
    this.citaId = parseInt(params.id, 10);

    if (isNaN(this.citaId) || this.citaId <= 0) {
      this.container.innerHTML = `
        <div style="text-align: center; color: var(--danger); padding: 40px 20px;">
          <p>ID de cita no proporcionado o inválido.</p>
        </div>
      `;
      return;
    }

    await this.loadSolicitud();
  }

  /**
   * Carga los datos de la cita desde la API.
   * Consulta primero el endpoint de detalle por ID y fallback a solicitudes.
   *
   * @returns {Promise<void>}
   */
  async loadSolicitud() {
    try {
      let cita = null;

      try {
        const response = await ApiService.get(`/admin/citas?id=${this.citaId}`);
        cita = response.data || null;
      } catch (e) {
        // Fallback a listado de solicitudes
        const response = await ApiService.get('/admin/solicitudes');
        const solicitudes = response.data || [];
        cita = solicitudes.find(s => (s.cita_id === this.citaId || s.id === this.citaId)) || null;
      }

      if (!cita) {
        this.container.innerHTML = `
          <div style="text-align: center; color: var(--text-muted); padding: 40px 20px;">
            <div style="font-size: 2.5rem; margin-bottom: 12px; opacity: 0.5;">${iconCardChecklist()}</div>
            <p>La cita o solicitud no fue encontrada. Es posible que haya sido eliminada.</p>
          </div>
        `;
        return;
      }

      this.renderDetalle(cita);
    } catch (error) {
      this.container.innerHTML = `
        <div style="text-align: center; color: var(--danger); padding: 40px 20px;">
          <p>Error al cargar la cita: ${escapeHtml(error.message)}</p>
        </div>
      `;
    }
  }

  /**
   * Renderiza el detalle completo de la cita adaptando acciones según su estado.
   *
   * @param {Object} cita - Datos de la cita
   * @returns {void}
   */
  renderDetalle(cita) {
    const estado = (cita.estado || 'pendiente').toLowerCase();
    const isEnCursoNow = isEnCurso(cita.fecha_cita, cita.hora_inicio, cita.hora_fin);

    // Actualizar títulos en el encabezado
    const titleEl = document.getElementById('solicitud-header-title');
    const subtitleEl = document.getElementById('solicitud-header-subtitle');
    if (titleEl && subtitleEl) {
      if (estado === 'pendiente') {
        titleEl.textContent = 'Detalle de Solicitud';
        subtitleEl.textContent = 'Gestiona esta cita pendiente de confirmación';
      } else if (estado === 'confirmada') {
        titleEl.textContent = 'Detalle de Cita';
        subtitleEl.textContent = isEnCursoNow ? 'Cita confirmada • En curso' : 'Cita confirmada';
      } else {
        titleEl.textContent = 'Detalle de Cita';
        subtitleEl.textContent = `Cita ${estado}`;
      }
    }

    // Badge de estado accesible
    let estadoBadge = '';
    if (estado === 'confirmada') {
      estadoBadge = `<span class="estado-badge badge-confirmada">${iconCheckCircleFill()} Confirmada</span>`;
      if (isEnCursoNow) {
        estadoBadge += ` <span class="cita-hoy-tag tag-encurso"><span class="pulse-dot"></span> En curso</span>`;
      }
    } else if (estado === 'pendiente') {
      estadoBadge = `<span class="estado-badge badge-pendiente">${iconExclamationTriangleFill()} Pendiente</span>`;
    } else if (estado === 'cancelada') {
      estadoBadge = `<span class="estado-badge badge-cancelada">${iconXCircleFill()} Cancelada</span>`;
    } else {
      estadoBadge = `<span class="estado-badge">${escapeHtml(estado)}</span>`;
    }

    // Teléfono y WhatsApp
    let telefonoHtml = 'No proporcionado';
    let cleanPhone = '';
    let waUrl = '';

    if (cita.cliente_telefono) {
      cleanPhone = String(cita.cliente_telefono).replace(/\D/g, '');
      const waNumber = (cleanPhone.length === 10) ? `52${cleanPhone}` : cleanPhone;
      waUrl = `https://wa.me/${waNumber}`;

      const waBadge = cita.tiene_whatsapp
        ? `<span style="color: #16a34a; display: inline-flex; align-items: center; gap: 4px; font-weight: 600; margin-left: 6px;">${iconChatDotsFill()} WhatsApp</span>`
        : '';

      telefonoHtml = `${escapeHtml(cita.cliente_telefono)} ${waBadge}`;
    }

    const horaInicio = (cita.hora_inicio || '').substring(0, 5);
    const horaFin = (cita.hora_fin || '').substring(0, 5);
    const horarioStr = horaFin ? `${horaInicio} - ${horaFin}` : horaInicio;

    // Generar acciones según estado
    let accionesHtml = '';
    if (estado === 'pendiente') {
      accionesHtml = `
        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 24px;">
          <button class="btn btn-accept" data-id="${cita.cita_id || cita.id}" style="width: 100%; padding: 14px; font-size: 1rem;">
            ${iconCheckCircleFill('icon-btn')} Aceptar Solicitud
          </button>
          <button class="btn btn-reject" data-id="${cita.cita_id || cita.id}" style="width: 100%; padding: 14px; font-size: 1rem;">
            ${iconXCircleFill('icon-btn')} Rechazar Solicitud
          </button>
        </div>
      `;
    } else if (estado === 'confirmada') {
      accionesHtml = `
        <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 24px;">
          ${waUrl ? `
            <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn" style="background: #16a34a; color: #fff; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 14px; font-size: 1rem; border: none; font-weight: 600; border-radius: var(--radius-md);">
              ${iconChatDotsFill('icon-btn')} Contactar por WhatsApp
            </a>
          ` : ''}
          <button class="btn btn-reject" id="btn-cancelar-cita" data-id="${cita.cita_id || cita.id}" style="width: 100%; padding: 14px; font-size: 1rem;">
            ${iconXCircleFill('icon-btn')} Cancelar Cita
          </button>
        </div>
      `;
    } else if (estado === 'cancelada') {
      accionesHtml = `
        <div style="margin-top: 20px; padding: 14px; background: var(--bg-card-subtle); border: 1px solid var(--border-light); border-radius: var(--radius-md); text-align: center; color: var(--text-muted); font-size: 0.9rem;">
          Esta cita se encuentra cancelada.
        </div>
      `;
    }

    const html = `
      <div style="border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 18px; background: var(--bg-card-subtle);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
          <div style="min-width: 0; flex: 1;">
            <h3 style="font-size: 1.25rem; color: var(--text-main); margin-bottom: 4px; word-break: break-word;">
              ${escapeHtml(cita.cliente_nombre)}
            </h3>
            <p style="font-size: 0.95rem; color: var(--primary); font-weight: 600;">
              ${escapeHtml(cita.servicio_nombre)}
            </p>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
            ${estadoBadge}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 14px; font-size: 0.9rem; color: var(--text-main);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: var(--text-muted); display: inline-flex;">${iconCalendar3()}</span>
            <span><strong>Fecha:</strong> ${escapeHtml(cita.fecha_cita)}</span>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: var(--text-muted); display: inline-flex;">${iconClockFill()}</span>
            <span><strong>Horario:</strong> ${escapeHtml(horarioStr)}</span>
          </div>

          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span style="color: var(--text-muted); display: inline-flex;">${iconCardChecklist()}</span>
            <span><strong>Teléfono:</strong> ${telefonoHtml}</span>
          </div>

          ${cita.codigo_cita ? `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: var(--text-muted); display: inline-flex;">#</span>
              <span><strong>Código:</strong> <code>${escapeHtml(cita.codigo_cita)}</code></span>
            </div>
          ` : ''}

          ${cita.notas_cliente ? `
            <div style="margin-top: 6px; padding: 12px; background: var(--bg-card); border-radius: var(--radius-sm); border-left: 3px solid var(--primary);">
              <strong style="display: block; margin-bottom: 4px; font-size: 0.85rem; color: var(--text-muted);">Notas del Paciente:</strong>
              <p style="margin: 0; color: var(--text-main); font-size: 0.9rem; white-space: pre-wrap;">${escapeHtml(cita.notas_cliente)}</p>
            </div>
          ` : ''}

          ${cita.notas_admin ? `
            <div style="margin-top: 6px; padding: 12px; background: var(--bg-card); border-radius: var(--radius-sm); border-left: 3px solid var(--btn-orange-bg);">
              <strong style="display: block; margin-bottom: 4px; font-size: 0.85rem; color: var(--text-muted);">Notas / Motivo Administrativo:</strong>
              <p style="margin: 0; color: var(--text-main); font-size: 0.9rem; white-space: pre-wrap;">${escapeHtml(cita.notas_admin)}</p>
            </div>
          ` : ''}
        </div>

        ${accionesHtml}
      </div>
    `;

    this.container.innerHTML = html;

    // Asignar eventos de interacción
    const btnAccept = this.container.querySelector('.btn-accept');
    const btnReject = this.container.querySelector('.btn-reject');
    const btnCancel = this.container.querySelector('#btn-cancelar-cita');

    if (btnAccept) {
      btnAccept.addEventListener('click', () => this.handleAccept(btnAccept.dataset.id, btnAccept));
    }

    if (btnReject) {
      btnReject.addEventListener('click', () => this.handleReject(btnReject.dataset.id, btnReject));
    }

    if (btnCancel) {
      btnCancel.addEventListener('click', () => this.handleCancelCita(btnCancel.dataset.id, btnCancel));
    }
  }

  /**
   * Maneja la acción de aceptar una solicitud pendiente.
   * Solicita mensaje opcional con modal táctil y confirma la cita vía API.
   *
   * @param {string} citaId - ID de la cita a confirmar
   * @param {HTMLButtonElement} btn - Botón que disparó la acción
   * @returns {Promise<void>}
   */
  async handleAccept(citaId, btn) {
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
      btn.disabled = true;
      btn.innerHTML = 'Procesando...';

      const res = await ApiService.post('/admin/citas/confirmar', {
        cita_id: parseInt(citaId, 10),
        mensaje_admin: msg
      });

      if (res.data && res.data.whatsapp_url) {
        window.open(res.data.whatsapp_url, '_blank');
      }

      window.location.hash = '#home';
    } catch (error) {
      await Modal.alert({
        title: 'Error al confirmar',
        message: error.message,
        type: 'error'
      });
      btn.disabled = false;
      btn.innerHTML = `${iconCheckCircleFill('icon-btn')} Aceptar Solicitud`;
    }
  }

  /**
   * Maneja la acción de rechazar una solicitud pendiente.
   * Solicita motivo opcional con modal táctil y cancela la cita vía API.
   *
   * @param {string} citaId - ID de la cita a rechazar
   * @param {HTMLButtonElement} btn - Botón que disparó la acción
   * @returns {Promise<void>}
   */
  async handleReject(citaId, btn) {
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
      btn.disabled = true;
      btn.innerHTML = 'Procesando...';

      const res = await ApiService.post('/admin/citas/cancelar', {
        cita_id: parseInt(citaId, 10),
        motivo: motivo
      });

      if (res.data && res.data.whatsapp_url) {
        window.open(res.data.whatsapp_url, '_blank');
      }

      window.location.hash = '#home';
    } catch (error) {
      await Modal.alert({
        title: 'Error al cancelar',
        message: error.message,
        type: 'error'
      });
      btn.disabled = false;
      btn.innerHTML = `${iconXCircleFill('icon-btn')} Rechazar Solicitud`;
    }
  }

  /**
   * Maneja la acción de cancelar una cita confirmada.
   * Solicita motivo con modal táctil y cancela la cita vía API.
   *
   * @param {string} citaId - ID de la cita a cancelar
   * @param {HTMLButtonElement} btn - Botón que disparó la acción
   * @returns {Promise<void>}
   */
  async handleCancelCita(citaId, btn) {
    const motivo = await Modal.prompt({
      title: 'Cancelar Cita',
      message: 'Indica el motivo de la cancelación de la cita (Opcional):',
      placeholder: 'Ej. Imprevisto de fuerza mayor, solicitud del paciente...',
      confirmText: 'Cancelar Cita',
      confirmType: 'reject',
      isTextarea: true
    });
    if (motivo === null) return; // Cancelado

    try {
      btn.disabled = true;
      btn.innerHTML = 'Cancelando...';

      const res = await ApiService.post('/admin/citas/cancelar', {
        cita_id: parseInt(citaId, 10),
        motivo: motivo
      });

      if (res.data && res.data.whatsapp_url) {
        window.open(res.data.whatsapp_url, '_blank');
      }

      await Modal.alert({
        title: 'Cita Cancelada',
        message: 'La cita ha sido cancelada correctamente.',
        type: 'info'
      });

      window.location.hash = '#home';
    } catch (error) {
      await Modal.alert({
        title: 'Error al cancelar',
        message: error.message,
        type: 'error'
      });
      btn.disabled = false;
      btn.innerHTML = `${iconXCircleFill('icon-btn')} Cancelar Cita`;
    }
  }
}
