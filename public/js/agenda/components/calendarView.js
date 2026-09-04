/**
 * Casa Nei - Vista de Selección de Fecha / Calendario (Paso 2)
 * @module components/calendarView
 */

import { escapeHtml } from '../utils/sanitizer.js';
import { parseLocalDate, getDayShortName, getMonthShortName, formatDateAccessible } from '../utils/date.js';

/**
 * Renderiza la vista del calendario mensual/semanal.
 * @param {import('../api.js').Servicio} servicio - Servicio seleccionado.
 * @param {import('../api.js').DiaCalendario[]} calendario - Lista de días y su disponibilidad.
 * @param {string|null} fechaSeleccionada - Fecha seleccionada en formato YYYY-MM-DD.
 * @returns {string} Markup HTML accesible.
 */
export function renderCalendarView(servicio, calendario, fechaSeleccionada) {
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
        <p>Disponibilidad para las próximas 4 semanas.</p>
      </div>

      <!-- Leyenda de Estados -->
      <div class="agenda-legend" role="region" aria-label="Leyenda de colores del calendario">
        <span class="legend-item"><span class="badge disponible" aria-hidden="true"></span> Disponible</span>
        <span class="legend-item"><span class="badge pendiente" aria-hidden="true"></span> En confirmación</span>
        <span class="legend-item"><span class="badge ocupado" aria-hidden="true"></span> Ocupado</span>
        <span class="legend-item"><span class="badge cerrado" aria-hidden="true"></span> No disponible</span>
      </div>

      <!-- Cuadrícula del Calendario -->
      <div class="agenda-calendar-grid" role="group" aria-label="Días disponibles para agendar cita">
  `;

  calendario.forEach((dia) => {
    const dateObj = parseLocalDate(dia.fecha);
    const diaNombre = dateObj ? getDayShortName(dateObj.getDay()) : '';
    const diaNumero = dateObj ? dateObj.getDate() : '';
    const mesNombre = dateObj ? getMonthShortName(dateObj.getMonth()) : '';
    const accessibleDateText = formatDateAccessible(dia.fecha);

    const isSelectable = dia.estado === 'disponible';
    const isSelected = fechaSeleccionada === dia.fecha;

    let statusBadge = '';
    let accessibleStatus = '';

    if (dia.estado === 'disponible') {
      statusBadge = `<span class="dia-tag disponible">${dia.slots_libres} libres</span>`;
      accessibleStatus = `${dia.slots_libres} horarios libres`;
    } else if (dia.estado === 'ocupado') {
      statusBadge = `<span class="dia-tag ocupado">Lleno</span>`;
      accessibleStatus = 'Día lleno sin horarios';
    } else if (dia.estado === 'bloqueado') {
      const motivo = dia.motivo || 'Festivo';
      statusBadge = `<span class="dia-tag cerrado">${escapeHtml(motivo)}</span>`;
      accessibleStatus = `Bloqueado: ${motivo}`;
    } else {
      statusBadge = `<span class="dia-tag cerrado">Cerrado</span>`;
      accessibleStatus = 'No disponible';
    }

    const pendingDot = dia.tiene_pendientes
      ? `<span class="pending-dot" title="Tiene solicitudes en confirmación" aria-hidden="true"></span>`
      : '';

    const buttonClass = [
      'agenda-calendar-day',
      dia.estado,
      isSelectable ? 'clickable' : 'disabled',
      isSelected ? 'selected' : ''
    ].filter(Boolean).join(' ');

    html += `
      <button type="button" 
              class="${buttonClass}" 
              data-fecha="${dia.fecha}"
              ${!isSelectable ? 'disabled aria-disabled="true"' : ''}
              ${isSelected ? 'aria-pressed="true"' : 'aria-pressed="false"'}
              aria-label="${accessibleDateText}, ${accessibleStatus}">
        ${pendingDot}
        <span class="day-name" aria-hidden="true">${diaNombre}</span>
        <span class="day-number" aria-hidden="true">${diaNumero}</span>
        <span class="day-month" aria-hidden="true">${mesNombre}</span>
        ${statusBadge}
      </button>
    `;
  });

  html += `
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
 */
export function attachCalendarListeners(container, onSelectFecha, onChangeServicio) {
  const changeBtn = container.querySelector('#btn-cambiar-servicio');
  if (changeBtn && typeof onChangeServicio === 'function') {
    changeBtn.addEventListener('click', onChangeServicio);
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
