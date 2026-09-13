/**
 * Casa Nei - Utilidad de Desplazamiento Suave y Posicionamiento de Vista
 * Gestiona el scroll responsivo compensando la altura dinámica de la barra de navegación fija.
 * @module utils/scroll
 */

/**
 * Desplaza suavemente la ventana gráfica hacia el contenedor de la agenda o un elemento específico,
 * compensando la altura dinámica del navbar fijo y añadiendo un margen visual de respiro.
 *
 * @param {string|HTMLElement} [target='agenda-flow-container'] - ID del elemento o elemento DOM objetivo.
 * @param {number} [offsetExtra=16] - Margen de seguridad en píxeles debajo del header.
 * @returns {void}
 */
export function scrollToAgendaTop(target = 'agenda-flow-container', offsetExtra = 16) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const targetEl = typeof target === 'string' ? document.getElementById(target) : target;
  if (!targetEl) return;

  const navbar = document.querySelector('.navbar');
  const navbarHeight = navbar && navbar.offsetHeight > 0 ? navbar.offsetHeight : 80;

  const targetRect = targetEl.getBoundingClientRect();
  const targetTop = targetRect.top + window.pageYOffset;
  const targetScrollY = Math.max(0, targetTop - navbarHeight - offsetExtra);

  window.scrollTo({
    top: targetScrollY,
    behavior: 'smooth'
  });
}

/**
 * Intercepta los enlaces ancla con destino #agenda para garantizar que el desplazamiento
 * sea suave y el título no quede cubierto por el header fijo.
 * 
 * @returns {void}
 */
export function initAgendaAnchorLinks() {
  if (typeof document === 'undefined') return;

  const links = document.querySelectorAll('a[href="#agenda"]');
  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      const agendaSection = document.getElementById('agenda');
      if (agendaSection) {
        e.preventDefault();
        try {
          history.pushState(null, '', '#agenda');
        } catch (_) {
          // Ignorar si el contexto del navegador restringe pushState
        }
        scrollToAgendaTop('agenda', 20);
      }
    });
  });
}
