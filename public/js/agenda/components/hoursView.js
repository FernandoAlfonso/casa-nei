/**
 * Casa Nei - Vista de Selección de Horarios (Paso 3)
 * @module components/hoursView
 */

import { escapeHtml } from '../utils/sanitizer.js';
import { formatDateLegible } from '../utils/date.js';

/**
 * Renderiza la vista de selección de horarios para una fecha y servicio seleccionados.
 * @param {import('../api.js').Servicio} servicio - Servicio seleccionado.
 * @param {string} fecha - Fecha seleccionada (YYYY-MM-DD).
 * @param {import('../api.js').SlotHora[]} horas - Horarios disponibles.
 * @param {import('../api.js').SlotHora|null} horaSeleccionada - Horario actualmente seleccionado.
 * @param {boolean} [loading=false] - Indica si los horarios se están consultando.
 * @returns {string} Markup HTML accesible.
 */
export function renderHoursView(servicio, fecha, horas, horaSeleccionada, loading = false) {
  const fechaTexto = formatDateLegible(fecha);

  let html = `
    <div class="agenda-step-content animate-fade-in">
      
      <!-- Resumen de Selección Previa -->
      <div class="agenda-selected-summary">
        <div class="summary-item">
          <span class="label">Servicio y Fecha:</span>
          <strong>${escapeHtml(servicio.nombre)} &bull; ${fechaTexto}</strong>
        </div>
        <button class="btn-change-step" id="btn-cambiar-dia" type="button" aria-label="Cambiar día seleccionado">
          <i class="fas fa-calendar-alt" aria-hidden="true"></i> Cambiar día
        </button>
      </div>

      <div class="agenda-header-text">
        <h3>Selecciona el horario de tu preferencia</h3>
        <p>Espacios disponibles para el <strong>${fechaTexto}</strong> (duración: ${servicio.duracion_minutos} min):</p>
      </div>
  `;

  if (loading) {
    html += `
      <div class="agenda-loading" role="status" aria-live="polite">
        <i class="fas fa-circle-notch fa-spin" aria-hidden="true"></i>
        Consultando horarios libres para el ${fechaTexto}...
      </div>
    `;
  } else if (!horas || horas.length === 0) {
    html += `
      <div class="agenda-alert warning" role="alert">
        <i class="fas fa-info-circle" aria-hidden="true"></i>
        No encontramos horarios disponibles para esta fecha. Por favor selecciona otro día.
        <br><br>
        <button class="btn-secondary" id="btn-elegir-otro-dia" type="button">
          <i class="fas fa-calendar-day" aria-hidden="true"></i> Elegir otro día
        </button>
      </div>
    `;
  } else {
    html += `
      <div class="agenda-horas-list" role="group" aria-label="Horarios disponibles para ${fechaTexto}">
    `;

    horas.forEach((h) => {
      const isSelected = horaSeleccionada && horaSeleccionada.hora_inicio === h.hora_inicio;
      html += `
        <button type="button" 
                class="btn-slot-hora ${isSelected ? 'selected' : ''}" 
                data-inicio="${h.hora_inicio}" 
                data-fin="${h.hora_fin}"
                data-inicio-completo="${h.hora_inicio_completa}"
                data-fin-completo="${h.hora_fin_completa}"
                aria-pressed="${isSelected ? 'true' : 'false'}"
                aria-label="Cita de ${h.hora_inicio} a ${h.hora_fin} hrs">
          <i class="far fa-clock" aria-hidden="true"></i> ${h.hora_inicio} - ${h.hora_fin} hrs
        </button>
      `;
    });

    html += `
      </div>
    `;
  }

  html += `
    </div>
  `;

  return html;
}

/**
 * Asocia los escuchadores de eventos para la selección de horarios.
 * @param {HTMLElement} container - Contenedor raíz.
 * @param {import('../api.js').SlotHora[]} horas - Horarios disponibles.
 * @param {function(import('../api.js').SlotHora): void} onSelectHora - Callback al seleccionar hora.
 * @param {function(): void} onChangeDia - Callback al pulsar "Cambiar día".
 */
export function attachHoursListeners(container, horas, onSelectHora, onChangeDia) {
  const changeBtn = container.querySelector('#btn-cambiar-dia');
  if (changeBtn && typeof onChangeDia === 'function') {
    changeBtn.addEventListener('click', onChangeDia);
  }

  const chooseAnotherBtn = container.querySelector('#btn-elegir-otro-dia');
  if (chooseAnotherBtn && typeof onChangeDia === 'function') {
    chooseAnotherBtn.addEventListener('click', onChangeDia);
  }

  const slotButtons = container.querySelectorAll('.btn-slot-hora');
  slotButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const inicio = btn.dataset.inicio;
      const hora = horas.find((h) => h.hora_inicio === inicio);
      if (hora && typeof onSelectHora === 'function') {
        onSelectHora(hora);
      }
    });
  });
}
