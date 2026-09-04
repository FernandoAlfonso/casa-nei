/**
 * Casa Nei - Vista de Selección de Servicios (Paso 1)
 * @module components/servicesView
 */

import { escapeHtml } from '../utils/sanitizer.js';

/**
 * Renderiza la vista de selección de servicios.
 * @param {import('../api.js').Servicio[]} servicios - Lista de servicios disponibles.
 * @param {import('../api.js').Servicio|null} servicioSeleccionado - Servicio actualmente seleccionado si existe.
 * @returns {string} Markup HTML.
 */
export function renderServicesView(servicios, servicioSeleccionado) {
  if (!servicios || servicios.length === 0) {
    return `
      <div class="agenda-step-content animate-fade-in">
        <div class="agenda-alert warning" role="alert">
          <i class="fas fa-info-circle"></i> No se encontraron servicios activos en este momento.
        </div>
      </div>
    `;
  }

  let html = `
    <div class="agenda-step-content animate-fade-in">
      <div class="agenda-header-text">
        <h3>Selecciona el servicio que deseas</h3>
        <p>Elige el tipo de consulta o terapia para mostrarte la disponibilidad correspondiente.</p>
      </div>

      <div class="agenda-services-grid" role="group" aria-label="Catálogo de servicios disponibles">
  `;

  servicios.forEach((s) => {
    const isSelected = servicioSeleccionado && servicioSeleccionado.id === s.id;
    const precioNum = parseFloat(String(s.precio || 0));
    const precioTexto = precioNum > 0
      ? `$${precioNum.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`
      : 'A convenir';

    html += `
      <div class="agenda-service-card ${isSelected ? 'selected' : ''}" 
           data-id="${s.id}" 
           role="button" 
           tabindex="0"
           aria-pressed="${isSelected ? 'true' : 'false'}"
           aria-label="Seleccionar ${escapeHtml(s.nombre)}, duración ${s.duracion_minutos} minutos, precio ${precioTexto}">
        <div class="service-icon" aria-hidden="true"><i class="fas fa-leaf"></i></div>
        <h4>${escapeHtml(s.nombre)}</h4>
        <p class="service-desc">${escapeHtml(s.descripcion || '')}</p>
        <div class="service-meta">
          <span><i class="far fa-clock" aria-hidden="true"></i> ${s.duracion_minutos} min</span>
          <span class="service-price">${precioTexto}</span>
        </div>
        <button class="btn-select-service" type="button" tabindex="-1">
          ${isSelected ? '<i class="fas fa-check" aria-hidden="true"></i> Seleccionado' : 'Elegir servicio'}
        </button>
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  return html;
}

/**
 * Asocia los escuchadores de eventos para la selección de servicio.
 * @param {HTMLElement} container - Contenedor raíz.
 * @param {import('../api.js').Servicio[]} servicios - Catálogo de servicios.
 * @param {function(import('../api.js').Servicio): void} onSelectServicio - Callback al seleccionar.
 */
export function attachServicesListeners(container, servicios, onSelectServicio) {
  const cards = container.querySelectorAll('.agenda-service-card');
  cards.forEach((card) => {
    const serviceId = parseInt(card.dataset.id, 10);
    const service = servicios.find((s) => s.id === serviceId);
    if (!service) return;

    const selectHandler = () => {
      if (typeof onSelectServicio === 'function') {
        onSelectServicio(service);
      }
    };

    card.addEventListener('click', selectHandler);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectHandler();
      }
    });
  });
}
