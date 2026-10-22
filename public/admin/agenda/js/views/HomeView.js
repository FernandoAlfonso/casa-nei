/**
 * Casa Nei - Vista de Inicio (Solicitudes Pendientes y Citas del Día)
 *
 * Accesibilidad para daltonismo:
 *  - Botón Aceptar: icono ✓ (check) + verde
 *  - Botón Rechazar: icono ✕ (x) + naranja-oscuro (distinto de verde por luminancia)
 *  - Íconos SVG reemplazan emojis para consistencia Android/iOS/Web
 *  - Estados de citas con iconos distintivos y bordes laterales reforzados
 *
 * Enfoque móvil y reglas de negocio:
 *  - En primer lugar se muestran las solicitudes pendientes.
 *  - Si no hay solicitudes, se muestran las citas del día con protagonismo en primer lugar.
 *  - Listado compacto para celular, auto-scroll a la cita en curso o más próxima del día.
 *  - Posibilidad de ver hacia atrás (mismo día) con opacidad reducida.
 *  - Peticiones con cache: 'no-store' estricto vía ApiService.
 *  - Contenedores con flex-wrap y min-width: 0 para evitar desbordamiento horizontal.
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
  iconChatDotsFill,
  iconCalendar3,
  iconClockFill,
  iconExclamationTriangleFill
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
 * Formatea una fecha local en formato YYYY-MM-DD sin desfase de zona horaria UTC.
 *
 * @param {Date} date - Instancia de Date
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
function getLocalDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Retorna la fecha de hoy en formato legible en español (ej. "Jueves, 22 de Octubre").
 *
 * @param {Date} date - Instancia de Date
 * @returns {string} Fecha legible
 */
function formatFechaLegible(date) {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return `${dias[date.getDay()]}, ${date.getDate()} de ${meses[date.getMonth()]}`;
}

/**
 * Vista principal de la agenda administrativa.
 * Gestiona solicitudes pendientes de confirmación y el listado de citas del día.
 */
export default class HomeView {
  constructor() {
    /** @type {Array<Object>} */
    this.solicitudes = [];
    /** @type {Array<Object>} */
    this.citasHoy = [];
    /** @type {HTMLElement|null} */
    this.container = null;
  }

  /**
   * Renderiza el markup HTML estructural inicial con header y contenedor de carga.
   *
   * @returns {string} Markup HTML inicial
   */
  render() {
    return `
      <div class="fade-in">
        <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <h1 style="font-size: 1.8rem;" id="home-title">Agenda</h1>
            <p style="color: var(--text-muted); font-size: 0.9rem;" id="home-subtitle">Cargando...</p>
          </div>
          <button class="btn btn-add" onclick="window.location.hash='#new-cita'" style="width: auto; padding: 10px 16px; font-size: 0.9rem; gap: 6px;">
            ${iconPlusCircleFill('icon-btn')} Nueva
          </button>
        </header>

        <div id="home-main-container">
          <div style="text-align: center; color: var(--text-muted); padding: 40px 20px;">
            <div class="spinner" style="margin: 0 auto 16px;"></div>
            Cargando agenda del día...
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Monta la vista: enlaza contenedor dinámico y carga solicitudes y citas del día.
   *
   * @returns {Promise<void>}
   */
  async mount() {
    this.container = document.getElementById('home-main-container');
    await this.loadData();
  }

  /**
   * Carga solicitudes pendientes y citas del día en paralelo desde la API.
   * Incluye cache: 'no-store' vía ApiService para evitar caché móvil agresivo.
   *
   * @returns {Promise<void>}
   */
  async loadData() {
    const todayStr = getLocalDateString(new Date());

    try {
      const [solicitudesRes, citasHoyRes] = await Promise.all([
        ApiService.get('/admin/solicitudes'),
        ApiService.get(`/admin/citas?fecha=${todayStr}&estados=confirmada,pendiente`)
      ]);

      this.solicitudes = solicitudesRes.data || [];
      this.citasHoy = citasHoyRes.data || [];

      this.renderSections();
    } catch (error) {
      if (this.container) {
        this.container.innerHTML = `
          <div class="card" style="text-align: center; color: var(--danger); padding: 40px 20px;">
            <p style="margin-bottom: 12px;">Error al cargar la información: ${escapeHtml(error.message)}</p>
            <button class="btn btn-secondary" onclick="window.location.reload()" style="width: auto; margin: 0 auto;">
              Reintentar
            </button>
          </div>
        `;
      }
    }
  }

  /**
   * Renderiza las secciones aplicando la regla de prioridad visual:
   * 1. Si hay solicitudes pendientes: Solicitudes arriba, Citas del día abajo.
   * 2. Si no hay solicitudes pendientes: Citas del día arriba con protagonismo, solicitudes compactas abajo.
   *
   * @returns {void}
   */
  renderSections() {
    if (!this.container) return;

    const now = new Date();
    const fechaLegible = formatFechaLegible(now);
    const hasSolicitudes = this.solicitudes.length > 0;

    // Actualizar títulos dinámicos del header según estado
    const titleEl = document.getElementById('home-title');
    const subtitleEl = document.getElementById('home-subtitle');
    if (titleEl && subtitleEl) {
      if (hasSolicitudes) {
        titleEl.textContent = 'Solicitudes y Citas';
        subtitleEl.textContent = `${this.solicitudes.length} ${this.solicitudes.length === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'}`;
      } else {
        titleEl.textContent = 'Citas de Hoy';
        subtitleEl.textContent = fechaLegible;
      }
    }

    const solicitudesHtml = this.renderSolicitudesSection(hasSolicitudes);
    const citasHoyHtml = this.renderCitasHoySection(fechaLegible, hasSolicitudes);

    let finalHtml = '';
    if (hasSolicitudes) {
      // Prioridad 1: Solicitudes arriba, Citas del día abajo
      finalHtml = `
        <div style="display: flex; flex-direction: column; gap: 20px;">
          ${solicitudesHtml}
          ${citasHoyHtml}
        </div>
      `;
    } else {
      // Prioridad 1: Citas del día arriba con protagonismo, aviso compacto de solicitudes abajo
      finalHtml = `
        <div style="display: flex; flex-direction: column; gap: 20px;">
          ${citasHoyHtml}
          ${solicitudesHtml}
        </div>
      `;
    }

    this.container.innerHTML = finalHtml;
    this.bindEvents();

    // Ejecutar auto-scroll si corresponde
    this.scrollToTargetCita(hasSolicitudes);
  }

  /**
   * Renderiza la sección de Solicitudes Pendientes.
   *
   * @param {boolean} hasSolicitudes - Indica si hay solicitudes pendientes
   * @returns {string} Markup HTML
   */
  renderSolicitudesSection(hasSolicitudes) {
    if (!hasSolicitudes) {
      return `
        <section id="seccion-solicitudes">
          <div class="solicitudes-empty-compact">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: var(--primary); display: inline-flex;">${iconCheckCircleFill()}</span>
              <span>No hay solicitudes pendientes en este momento</span>
            </div>
            <a href="#calendar" style="color: var(--primary); font-weight: 600; text-decoration: none; font-size: 0.85rem;">
              Calendario →
            </a>
          </div>
        </section>
      `;
    }

    let itemsHtml = '<div style="display: flex; flex-direction: column; gap: 14px;">';
    this.solicitudes.forEach(cita => {
      const whatsappIndicator = cita.tiene_whatsapp
        ? `<span style="color: #16a34a; display: inline-flex; align-items: center; gap: 4px;">${iconChatDotsFill()} WhatsApp</span>`
        : '';

      const horaCita = (cita.hora_inicio || '').substring(0, 5);

      itemsHtml += `
        <div style="border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 14px; background: var(--bg-card-subtle);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; flex-wrap: wrap; gap: 6px;">
            <div style="min-width: 0; flex: 1;">
              <h4 style="font-size: 1.05rem; color: var(--text-main); margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${escapeHtml(cita.cliente_nombre)}
              </h4>
              <p style="font-size: 0.85rem; color: var(--primary); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${escapeHtml(cita.servicio_nombre)}
              </p>
            </div>
            <div style="text-align: right; font-size: 0.82rem; color: var(--text-muted); min-width: 0;">
              <div>${iconCardChecklist()} ${escapeHtml(cita.fecha_cita)}</div>
              <div style="margin-top: 2px;">🕒 ${horaCita}</div>
            </div>
          </div>
          
          <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 12px; min-width: 0;">
            <p><strong>Teléfono:</strong> ${escapeHtml(cita.cliente_telefono) || 'No proporcionado'} ${whatsappIndicator}</p>
            ${cita.notas_cliente ? `<p style="margin-top: 4px;"><strong>Notas:</strong> ${escapeHtml(cita.notas_cliente)}</p>` : ''}
          </div>

          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn btn-accept" data-id="${cita.cita_id}" style="flex: 1; min-width: 120px; padding: 10px; font-size: 0.9rem;">
              ${iconCheckCircleFill('icon-btn')} Aceptar
            </button>
            <button class="btn btn-reject" data-id="${cita.cita_id}" style="flex: 1; min-width: 120px; padding: 10px; font-size: 0.9rem;">
              ${iconXCircleFill('icon-btn')} Rechazar
            </button>
          </div>
        </div>
      `;
    });
    itemsHtml += '</div>';

    return `
      <section class="card" id="seccion-solicitudes" style="padding: 0; overflow: hidden;">
        <div style="padding: 14px 18px; border-bottom: 1px solid var(--border-light); background: var(--bg-card-subtle); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            ${iconCardChecklist()}
            <h3 style="font-size: 1rem; color: var(--text-main); margin: 0;">Pendientes de Confirmación</h3>
          </div>
          <span style="background: var(--btn-orange-bg); color: var(--btn-orange-text); font-size: 0.75rem; padding: 2px 8px; border-radius: 9999px; font-weight: 700;">
            ${this.solicitudes.length}
          </span>
        </div>
        <div style="padding: 16px;">
          ${itemsHtml}
        </div>
      </section>
    `;
  }

  /**
   * Renderiza la sección de Citas de Hoy con diseño compacto y estados temporales.
   *
   * @param {string} fechaLegible - Fecha formateada para mostrar en el título
   * @param {boolean} hasSolicitudes - Si existen solicitudes pendientes arriba
   * @returns {string} Markup HTML
   */
  renderCitasHoySection(fechaLegible, hasSolicitudes) {
    const totalCitas = this.citasHoy.length;

    let quickJumpBtn = '';
    if (hasSolicitudes && totalCitas > 0) {
      quickJumpBtn = `
        <button class="btn btn-secondary" onclick="document.getElementById('seccion-citas-hoy')?.scrollIntoView({ behavior: 'smooth' });" style="width: auto; padding: 4px 10px; font-size: 0.78rem;">
          ${iconClockFill()} Ver hoy (${totalCitas})
        </button>
      `;
    }

    if (totalCitas === 0) {
      return `
        <section class="card" id="seccion-citas-hoy" style="padding: 0; overflow: hidden;">
          <div style="padding: 14px 18px; border-bottom: 1px solid var(--border-light); background: var(--bg-card-subtle); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              ${iconCalendar3()}
              <h3 style="font-size: 1rem; color: var(--text-main); margin: 0;">Citas de Hoy</h3>
            </div>
            <span style="font-size: 0.82rem; color: var(--text-muted);">${fechaLegible}</span>
          </div>
          <div style="text-align: center; color: var(--text-muted); padding: 36px 20px;">
            <div style="font-size: 2.2rem; margin-bottom: 10px; opacity: 0.4;">${iconCalendar3()}</div>
            <p style="font-weight: 600; margin-bottom: 4px; color: var(--text-main);">Sin citas agendadas para hoy</p>
            <p style="font-size: 0.85rem;">No tienes citas confirmadas o pendientes el día de hoy.</p>
          </div>
        </section>
      `;
    }

    // Clasificar citas por tiempo actual para definir: pasada, en-curso, proxima
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let targetCitaId = null;

    // 1. Buscar cita en curso (inicio <= actual < fin)
    for (const cita of this.citasHoy) {
      const startMin = parseTimeToMinutes(cita.hora_inicio);
      const endMin = parseTimeToMinutes(cita.hora_fin);
      if (currentMinutes >= startMin && currentMinutes < endMin) {
        targetCitaId = cita.cita_id || cita.id;
        break;
      }
    }

    // 2. Si no hay cita en curso, buscar la primera cita futura más próxima
    if (!targetCitaId) {
      for (const cita of this.citasHoy) {
        const startMin = parseTimeToMinutes(cita.hora_inicio);
        if (startMin > currentMinutes) {
          targetCitaId = cita.cita_id || cita.id;
          break;
        }
      }
    }

    let cardsHtml = '<div class="citas-hoy-section" style="padding: 14px;">';

    this.citasHoy.forEach(cita => {
      const citaId = cita.cita_id || cita.id;
      const startMin = parseTimeToMinutes(cita.hora_inicio);
      const endMin = parseTimeToMinutes(cita.hora_fin);

      let timeClass = '';
      let tagHtml = '';

      if (currentMinutes >= endMin) {
        // Cita pasada: opacidad reducida para indicar que ya transcurrió
        timeClass = 'pasada';
      } else if (currentMinutes >= startMin && currentMinutes < endMin) {
        // Cita en curso: acento visual activo
        timeClass = 'en-curso';
        tagHtml = `<span class="cita-hoy-tag tag-encurso"><span class="pulse-dot"></span> En curso</span>`;
      } else if (citaId === targetCitaId) {
        // Próxima cita del día: acento para auto-scroll
        timeClass = 'proxima';
        tagHtml = `<span class="cita-hoy-tag tag-proxima">Siguiente</span>`;
      }

      const estado = (cita.estado || 'pendiente').toLowerCase();
      const estadoBadge = estado === 'confirmada'
        ? `<span class="estado-badge badge-confirmada">${iconCheckCircleFill()} Confirmada</span>`
        : `<span class="estado-badge badge-pendiente">${iconExclamationTriangleFill()} Pendiente</span>`;

      const horaInicio = (cita.hora_inicio || '').substring(0, 5);
      const horaFin = (cita.hora_fin || '').substring(0, 5);

      const whatsappIcon = cita.tiene_whatsapp
        ? `<span style="color: #16a34a; margin-left: 4px; display: inline-flex;" title="WhatsApp">${iconChatDotsFill()}</span>`
        : '';

      const isTargetAttr = (citaId === targetCitaId) ? 'data-is-target="true"' : '';

      cardsHtml += `
        <div class="cita-hoy-card ${estado} ${timeClass}"
             data-id="${citaId}"
             ${isTargetAttr}
             role="button"
             tabindex="0"
             aria-label="Cita de ${escapeHtml(cita.cliente_nombre)}, ${horaInicio} a ${horaFin}">
          <div class="cita-hoy-card-header">
            <div class="cita-hoy-time-badge">
              <span class="cita-hoy-horario">${horaInicio} - ${horaFin}</span>
              ${estadoBadge}
            </div>
            ${tagHtml}
          </div>
          <div class="cita-hoy-card-body">
            <div class="cita-hoy-cliente">
              ${escapeHtml(cita.cliente_nombre)} ${whatsappIcon}
            </div>
            <div class="cita-hoy-servicio">
              ${escapeHtml(cita.servicio_nombre)}
            </div>
          </div>
        </div>
      `;
    });

    cardsHtml += '</div>';

    return `
      <section class="card" id="seccion-citas-hoy" style="padding: 0; overflow: hidden;">
        <div style="padding: 14px 18px; border-bottom: 1px solid var(--border-light); background: var(--bg-card-subtle); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            ${iconCalendar3()}
            <h3 style="font-size: 1rem; color: var(--text-main); margin: 0;">Citas de Hoy</h3>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600;">
              ${totalCitas} ${totalCitas === 1 ? 'cita' : 'citas'}
            </span>
            ${quickJumpBtn}
          </div>
        </div>
        ${cardsHtml}
      </section>
    `;
  }

  /**
   * Enlaza los manejadores de eventos táctiles y de teclado en la vista.
   *
   * @returns {void}
   */
  bindEvents() {
    if (!this.container) return;

    // Asignar eventos a botones de aceptar
    this.container.querySelectorAll('.btn-accept').forEach(btn => {
      btn.addEventListener('click', () => this.handleAccept(btn.dataset.id));
    });

    // Asignar eventos a botones de rechazar
    this.container.querySelectorAll('.btn-reject').forEach(btn => {
      btn.addEventListener('click', () => this.handleReject(btn.dataset.id));
    });

    // Asignar eventos de navegación rápida al tocar una tarjeta de cita del día
    this.container.querySelectorAll('.cita-hoy-card').forEach(card => {
      const citaId = card.dataset.id;
      if (!citaId) return;

      card.addEventListener('click', () => {
        window.location.hash = `#solicitud?id=${citaId}`;
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.location.hash = `#solicitud?id=${citaId}`;
        }
      });
    });
  }

  /**
   * Realiza auto-scroll a la cita en curso o más próxima del día.
   * Si no hay solicitudes pendientes, se desplaza hacia la cita objetivo inmediatamente.
   * Si hay solicitudes pendientes, mantiene el foco en solicitudes (prioridad 1) para
   * asegurar que el terapeuta atienda primero las confirmaciones urgentes.
   *
   * @param {boolean} hasSolicitudes - Si existen solicitudes pendientes
   * @returns {void}
   */
  scrollToTargetCita(hasSolicitudes) {
    if (hasSolicitudes) {
      // Prioridad 1 son las solicitudes: no mover la pantalla lejos de ellas al cargar
      return;
    }

    const targetEl = this.container?.querySelector('.cita-hoy-card[data-is-target="true"]');
    if (targetEl) {
      setTimeout(() => {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
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
      const btn = this.container?.querySelector(`.btn-accept[data-id="${citaId}"]`);
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = 'Procesando...';
      }

      const res = await ApiService.post('/admin/citas/confirmar', {
        cita_id: citaId,
        mensaje_admin: msg
      });

      if (res.data && res.data.whatsapp_url) {
        window.open(res.data.whatsapp_url, '_blank');
      }

      await this.loadData();
    } catch (error) {
      await Modal.alert({
        title: 'Error al confirmar',
        message: error.message,
        type: 'error'
      });
      await this.loadData();
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
      const btn = this.container?.querySelector(`.btn-reject[data-id="${citaId}"]`);
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = 'Procesando...';
      }

      const res = await ApiService.post('/admin/citas/cancelar', {
        cita_id: citaId,
        motivo: motivo
      });

      if (res.data && res.data.whatsapp_url) {
        window.open(res.data.whatsapp_url, '_blank');
      }

      await this.loadData();
    } catch (error) {
      await Modal.alert({
        title: 'Error al cancelar',
        message: error.message,
        type: 'error'
      });
      await this.loadData();
    }
  }
}
