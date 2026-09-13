/**
 * Casa Nei - Controlador de Visibilidad Dinámica de la Barra de Navegación
 * Oculta el navbar en scroll descendente y lo muestra en scroll ascendente.
 * @module utils/navbar
 */

/**
 * Inicializa el comportamiento de ocultar/mostrar la barra de navegación al hacer scroll.
 * Incorpora salvaguardas para iOS Safari (rubber-banding / rebote) y optimización con requestAnimationFrame.
 *
 * @param {string} [navbarSelector='.navbar'] - Selector CSS del navbar.
 * @param {Object} [options={}] - Opciones de configuración.
 * @param {number} [options.threshold=8] - Píxeles mínimos de desplazamiento para considerar cambio de dirección.
 * @param {number} [options.topOffset=25] - Coordenada Y por debajo de la cual el header siempre es visible.
 * @returns {function(): void} Función para destruir el escuchador si fuera necesario.
 */
export function initNavbarScroll(navbarSelector = '.navbar', options = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const navbar = document.querySelector(navbarSelector);
  if (!navbar) return () => {};

  const threshold = options.threshold || 8;
  const topOffset = options.topOffset || 25;

  let lastScrollY = Math.max(0, window.pageYOffset || document.documentElement.scrollTop || 0);
  let ticking = false;

  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const currentScrollY = Math.max(0, window.pageYOffset || document.documentElement.scrollTop || 0);

        // Salvaguarda: En la parte superior de la página, el header siempre debe estar visible
        if (currentScrollY <= topOffset) {
          navbar.classList.remove('navbar--hidden');
          lastScrollY = currentScrollY;
          ticking = false;
          return;
        }

        // Salvaguarda para iOS: rebote elástico en el fondo de la página
        const maxScrollY = document.documentElement.scrollHeight - window.innerHeight;
        if (currentScrollY >= maxScrollY - 15) {
          ticking = false;
          return;
        }

        const deltaY = currentScrollY - lastScrollY;

        // Evaluar cambio de dirección si supera el umbral mínimo
        if (Math.abs(deltaY) >= threshold) {
          if (deltaY > 0 && currentScrollY > 70) {
            // Desplazamiento hacia abajo: ocultar header
            navbar.classList.add('navbar--hidden');
          } else if (deltaY < 0) {
            // Desplazamiento hacia arriba: mostrar header
            navbar.classList.remove('navbar--hidden');
          }
          lastScrollY = currentScrollY;
        }

        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });

  // Si el usuario hace foco por teclado dentro del navbar, forzar visibilidad (Accesibilidad a11y)
  navbar.addEventListener('focusin', () => {
    navbar.classList.remove('navbar--hidden');
  });

  return () => {
    window.removeEventListener('scroll', onScroll);
  };
}
