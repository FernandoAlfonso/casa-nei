/**
 * Casa Nei - Vista de Éxito y Confirmación Vía WhatsApp (Paso 5)
 * @module components/successView
 */

import { escapeHtml, isSafeWhatsAppUrl } from '../utils/sanitizer.js';
import { formatDateLegible, formatTimeAmPm } from '../utils/date.js';

/**
 * Renderiza la pantalla de confirmación exitosa con enlace a WhatsApp o llamada telefónica.
 * @param {import('../api.js').CitaResponse} data - Información de la cita registrada.
 * @returns {string} Markup HTML accesible.
 */
export function renderSuccessView(data) {
  const codigo = escapeHtml(data.codigo_cita || '');
  const servicioNombre = escapeHtml(data.servicio?.nombre || 'Consulta');
  const fechaTexto = formatDateLegible(data.fecha_cita);
  const horaTexto = formatTimeAmPm(data.hora_inicio || '');
  const esLlamada = data.medio_contacto === 'llamada' || !data.whatsapp_url;
  const safeUrl = isSafeWhatsAppUrl(data.whatsapp_url) ? data.whatsapp_url : '#';

  if (esLlamada) {
    return `
      <div class="agenda-success-card animate-fade-in" role="region" aria-label="Confirmación de cita vía llamada">
        <div class="success-icon call-success-icon" aria-hidden="true">
          <i class="fas fa-phone-alt"></i>
        </div>

        <h2>¡Cita Registrada con Éxito!</h2>
        <p class="success-code">Código de Seguimiento: <strong>${codigo}</strong></p>

        <p class="success-desc">
          Tu solicitud para <strong>${servicioNombre}</strong> el día 
          <strong>${fechaTexto}</strong> a las <strong>${horaTexto}</strong> 
          ha sido registrada en el sistema.
        </p>

        <!-- Caja de acción de Llamada Telefónica -->
        <div class="call-action-box">
          <p class="action-instruction">
            <i class="fas fa-info-circle" aria-hidden="true"></i> 
            Como elegiste confirmación por llamada, comunícate directamente con el terapeuta pulsando el botón a continuación:
          </p>

          <a href="tel:+523121064455" 
             id="btn-llamar-directo"
             class="btn-primary btn-call-action"
             aria-label="Llamar al terapeuta de Casa Nei al 312 106 4455">
            <i class="fas fa-phone-alt" aria-hidden="true"></i> Llamar al Terapeuta (+52 312 106 4455)
          </a>

          <p class="call-notice">
            <i class="fas fa-clock" aria-hidden="true"></i> Horario de llamadas: Lunes a Viernes 9am - 1pm y 6pm - 9pm, Sábados 10am - 2pm.
          </p>
        </div>

        <div style="margin-top: 2rem;">
          <button type="button" class="btn-secondary" id="btn-agendar-otra">
            <i class="fas fa-calendar-plus" aria-hidden="true"></i> Agendar otra cita
          </button>
        </div>
      </div>
    `;
  }

  return `
    <div class="agenda-success-card animate-fade-in" role="region" aria-label="Confirmación de cita registrada">
      <div class="success-icon" aria-hidden="true">
        <i class="fab fa-whatsapp"></i>
      </div>

      <h2>¡Cita Registrada con Éxito!</h2>
      <p class="success-code">Código de Seguimiento: <strong>${codigo}</strong></p>

      <p class="success-desc">
        Tu solicitud para <strong>${servicioNombre}</strong> el día 
        <strong>${fechaTexto}</strong> a las <strong>${horaTexto}</strong> 
        ha sido registrada y está <em>Pendiente de confirmación</em> por el administrador.
      </p>

      <!-- Caja de acción de WhatsApp (Interacción directa sin bloqueo de pop-ups) -->
      <div class="whatsapp-action-box">
        <p>
          <i class="fas fa-info-circle" aria-hidden="true"></i> 
          Hemos preparado tu mensaje de confirmación. Presiona el botón a continuación para abrir WhatsApp y enviárselo directamente al terapeuta:
        </p>

        <a href="${safeUrl}" 
           id="btn-abrir-whatsapp"
           target="_blank" 
           rel="noopener noreferrer" 
           class="btn-primary btn-whatsapp-direct"
           aria-label="Abrir WhatsApp para enviar solicitud de cita">
          <i class="fab fa-whatsapp" aria-hidden="true"></i> Abrir WhatsApp y Enviar Solicitud
        </a>
      </div>

      <div style="margin-top: 2rem;">
        <button type="button" class="btn-secondary" id="btn-agendar-otra">
          <i class="fas fa-calendar-plus" aria-hidden="true"></i> Agendar otra cita
        </button>
      </div>
    </div>
  `;
}

/**
 * Asocia los escuchadores de eventos para la pantalla de éxito.
 * @param {HTMLElement} container - Contenedor raíz.
 * @param {function(): void} onReset - Callback al pulsar "Agendar otra cita".
 */
export function attachSuccessListeners(container, onReset) {
  const resetBtn = container.querySelector('#btn-agendar-otra');
  if (resetBtn && typeof onReset === 'function') {
    resetBtn.addEventListener('click', onReset);
  }
}
