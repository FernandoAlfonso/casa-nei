/**
 * Casa Nei - Módulo de Agenda y Citas
 * Redirección de compatibilidad hacia la arquitectura modular en js/agenda/main.js.
 * @module agenda
 */

import('./agenda/main.js').catch((err) => {
  console.error('[agenda.js] Error al inicializar el módulo modular de agenda:', err);
});
