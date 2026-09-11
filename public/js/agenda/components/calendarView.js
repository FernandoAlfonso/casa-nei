/**
 * Casa Nei - Vista de Selección de Fecha / Calendario (Paso 2)
 * @module components/calendarView
 */

import { escapeHtml } from '../utils/sanitizer.js';
import { parseLocalDate, getDayShortName, getMonthShortName, formatDateAccessible } from '../utils/date.js';

/**
 * Renderiza la vista del calendario con días disponibles garantizados.
 * @param {import('../api.js').Servicio} servicio - Servicio seleccionado.
 * @param {import('../api.js').DiaCalendario[]} calendario - Lista de días y su disponibilidad.
 * @param {string|null} fechaSeleccionada - Fecha seleccionada en formato YYYY-MM-DD.
 * @param {boolean} [cargandoMasDias=false] - Indica si se están cargando días adicionales.
 * @returns {string} Markup HTML accesible.
 */
export function renderCalendarView(servicio, calendario, fechaSeleccionada, cargandoMasDias = false) {
  // Filtrar estrictamente solo días que tengan estado disponible y slots libres
  const diasDisponibles = (calendario || []).filter(
    (dia) => dia.estado === 'disponible' && dia.slots_libres > 0
  );

  let html = `
    <div class="agenda-step-content animate-fade-in">
      
      <!-- Resumen del Servicio Seleccionado -->
      <div class="agenda-selected-summary">
        <div class="summary-item">
          <span class="label">Servicio seleccionado:</span>
          <strong>${escapeHtml(servicio.nombre)} (${servicio.duracion_minutos} min)</strong>
        </div>
        <button class="btn-change-step" id="btn-cambiar-servicio" type="button" aria-label="Cambiar servicio seleccionado">
          <i class="fas fa-edit" aria-hidden="true"></i> Cambiar
        </button>
      </div>

      <div class="agenda-header-text">
        <h3>Selecciona el día de tu cita</h3>
        <p>Próximos días con disponibilidad para atención:</p>
      </div>

      <!-- Leyenda Informativa de Días Disponibles -->
      <div class="agenda-legend-notice" role="note" aria-label="Aviso de disponibilidad">
        <i class="fas fa-info-circle" aria-hidden="true"></i>
        <span><strong>Nota:</strong> Solo se muestran los días con horarios disponibles. Los días cerrados o sin disponibilidad no aparecen en la lista.</span>
      </div>
  `;

  if (diasDisponibles.length === 0 && !cargandoMasDias) {
    html += `
      <div class="agenda-alert warning" role="alert" style="margin: 1.5rem 0;">
        <i class="fas fa-calendar-times" aria-hidden="true"></i>
        <span>No se encontraron horarios libres en el periodo inmediato. Puedes consultar las siguientes fechas con el botón a continuación.</span>
      </div>
    `;
  } else {
    html += `
      <!-- Cuadrícula del Calendario (Solo Días Disponibles) -->
      <div class="agenda-calendar-grid" role="group" aria-label="Días disponibles para agendar cita">
    `;

    diasDisponibles.forEach((dia) => {
      const dateObj = parseLocalDate(dia.fecha);
      const diaNombre = dateObj ? getDayShortName(dateObj.getDay()).toUpperCase() : '';
      const diaNumero = dateObj ? dateObj.getDate() : '';
      const mesNombre = dateObj ? getMonthShortName(dateObj.getMonth()) : '';
      const accessibleDateText = formatDateAccessible(dia.fecha);
      const isSelected = fechaSeleccionada === dia.fecha;

      const pendingDot = dia.tiene_pendientes
        ? `<span class="pending-dot" title="Tiene solicitudes en confirmación" aria-hidden="true"></span>`
        : '';

      const buttonClass = [
        'agenda-calendar-day',
        'disponible',
        'clickable',
        isSelected ? 'selected' : ''
      ].filter(Boolean).join(' ');

      html += `
        <button type="button" 
                class="${buttonClass}" 
                data-fecha="${dia.fecha}"
                ${isSelected ? 'aria-pressed="true"' : 'aria-pressed="false"'}
                aria-label="${accessibleDateText}, ${dia.slots_libres} horarios disponibles">
          ${pendingDot}
          <span class="day-name" aria-hidden="true">${diaNombre}</span>
          <span class="day-number" aria-hidden="true">${diaNumero}</span>
          <span class="day-month" aria-hidden="true">${mesNombre}</span>
          <span class="dia-tag disponible">${dia.slots_libres} libres</span>
        </button>
      `;
    });

    html += `
      </div>
    `;
  }

  // Botón sin límite para seguir consultando días posteriores
  html += `
      <div class="agenda-more-days-container">
        <button type="button" 
                class="btn-secondary btn-cargar-mas-semanas" 
                id="btn-cargar-siguientes-dias"
                ${cargandoMasDias ? 'disabled aria-busy="true"' : ''}>
          ${cargandoMasDias 
            ? '<i class="fas fa-circle-notch fa-spin" aria-hidden="true"></i> Consultando siguientes días...' 
            : '<i class="fas fa-calendar-plus" aria-hidden="true"></i> Ver siguientes días disponibles'
          }
        </button>
      </div>
    </div>
  `;

  return html;
}

/**
 * Asocia los escuchadores de eventos para el calendario.
 * @param {HTMLElement} container - Contenedor raíz.
 * @param {function(string): void} onSelectFecha - Callback al seleccionar una fecha (formato YYYY-MM-DD).
 * @param {function(): void} onChangeServicio - Callback al pulsar "Cambiar servicio".
 * @param {function(): void} [onCargarMasDias] - Callback al pulsar "Ver siguientes días disponibles".
 */
export function attachCalendarListeners(container, onSelectFecha, onChangeServicio, onCargarMasDias) {
  const changeBtn = container.querySelector('#btn-cambiar-servicio');
  if (changeBtn && typeof onChangeServicio === 'function') {
    changeBtn.addEventListener('click', onChangeServicio);
  }

  const moreDaysBtn = container.querySelector('#btn-cargar-siguientes-dias');
  if (moreDaysBtn && typeof onCargarMasDias === 'function') {
    moreDaysBtn.addEventListener('click', onCargarMasDias);
  }

  const dayButtons = container.querySelectorAll('.agenda-calendar-day.clickable');
  dayButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const fecha = btn.dataset.fecha;
      if (fecha && typeof onSelectFecha === 'function') {
        onSelectFecha(fecha);
      }
    });
  });
}

