/**
 * Casa Nei - Componente de Barra de Pasos de la Agenda
 * @module components/stepsBar
 */

/**
 * Renderiza el HTML semántico y accesible de la barra de progreso de los 4 pasos.
 * @param {number} currentStep - Paso actual (1: Servicio, 2: Fecha, 3: Horario, 4: Confirmación, 5: Éxito)
 * @returns {string} Markup HTML accesible.
 */
export function renderStepsBar(currentStep) {
  // Si estamos en el paso de éxito final (5), ocultamos o mostramos completa la barra
  if (currentStep >= 5) return '';

  const steps = [
    { num: 1, label: 'Servicio', id: 'step-nav-1' },
    { num: 2, label: 'Fecha', id: 'step-nav-2' },
    { num: 3, label: 'Horario', id: 'step-nav-3' },
    { num: 4, label: 'Confirmación', id: 'step-nav-4' }
  ];

  let html = `
    <nav class="agenda-steps-bar" aria-label="Progreso de la cita" role="list">
  `;

  steps.forEach((s, idx) => {
    const isActive = currentStep === s.num;
    const isCompleted = currentStep > s.num;
    const isClickable = isCompleted; // Solo se puede retroceder a pasos ya completados

    const activeClass = isActive ? 'active' : '';
    const completedClass = isCompleted ? 'completed' : '';
    const clickableClass = isClickable ? 'clickable-step' : '';
    const ariaCurrent = isActive ? 'aria-current="step"' : '';

    html += `
      <div class="agenda-step-item ${activeClass} ${completedClass} ${clickableClass}" 
           role="listitem" 
           data-step-target="${s.num}"
           ${ariaCurrent}
           ${isClickable ? 'tabindex="0" role="button" aria-label="Volver a paso ' + s.num + ': ' + s.label + '"' : ''}>
        <span class="step-num">${isCompleted ? '<i class="fas fa-check" aria-hidden="true"></i>' : s.num}</span>
        <span class="step-label">${s.label}</span>
      </div>
    `;

    // Conector entre pasos
    if (idx < steps.length - 1) {
      const connectorCompleted = currentStep > s.num ? 'completed' : '';
      html += `<div class="step-connector ${connectorCompleted}" aria-hidden="true"></div>`;
    }
  });

  html += `</nav>`;
  return html;
}

/**
 * Asocia los escuchadores de clic para retroceder a pasos previamente completados.
 * @param {HTMLElement} container - Contenedor raíz de la agenda.
 * @param {function(number): void} onNavigateStep - Callback invocado al hacer clic en un paso completado.
 */
export function attachStepsBarListeners(container, onNavigateStep) {
  const stepItems = container.querySelectorAll('.agenda-step-item.clickable-step');
  stepItems.forEach((item) => {
    const target = parseInt(item.dataset.stepTarget, 10);
    const handler = () => {
      if (typeof onNavigateStep === 'function') {
        onNavigateStep(target);
      }
    };
    item.addEventListener('click', handler);
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handler();
      }
    });
  });
}
