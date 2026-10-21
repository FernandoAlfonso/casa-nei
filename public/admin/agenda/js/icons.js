/**
 * Casa Nei - Módulo de Iconos SVG (Bootstrap Icons)
 *
 * Centraliza todos los iconos Bootstrap Icons como SVG inline para:
 * - Independencia de red (funciona offline, sin CDN)
 * - Consistencia visual entre Android, iOS y Web
 * - Accesibilidad para daltonismo (iconos = diferenciador primario, no el color)
 *
 * Fuente: https://icons.getbootstrap.com/
 *
 * @module icons
 */

/**
 * Genera el markup SVG de un icono con clases y atributos de accesibilidad aplicados.
 *
 * @param {string} path   - El contenido SVG interno (paths)
 * @param {string} cls    - Clases CSS adicionales (ej. 'icon-btn')
 * @param {string} label  - Texto aria-label para accesibilidad (ej. 'Aceptar')
 * @returns {string} Markup HTML del SVG listo para insertar
 */
function svg(path, cls = '', label = '') {
  const ariaAttrs = label
    ? `role="img" aria-label="${label}"`
    : `aria-hidden="true"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" class="bi ${cls}" ${ariaAttrs}>${path}</svg>`;
}

// ============================================================
// Iconos de Estado (Calendario y Citas)
// ============================================================

/**
 * Icono: Círculo vacío nítido — Estado "nada agendado"
 * Usa trazo grueso (2.2px relativo a viewBox 16x16) para prevenir
 * artefactos de subpíxel que corten o deformen el círculo en pantallas móviles o desktop.
 * @param {string} [cls] - Clases CSS adicionales
 * @returns {string} SVG markup
 */
export const iconCircle = (cls = '') =>
  svg('<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="2.2"/>', cls, 'Nada agendado');

/**
 * Icono: Medio círculo (◐) — Estado "parcialmente agendado"
 * Mitad izquierda sólidamente rellena y circunferencia completa definida con trazo de 2px.
 * Evita confusiones visuales y artefactos que parezcan una "C" incompleta.
 * @param {string} [cls] - Clases CSS adicionales
 * @returns {string} SVG markup
 */
export const iconCircleHalf = (cls = '') =>
  svg('<path d="M8 2.5 A5.5 5.5 0 0 0 8 13.5 Z" fill="currentColor"/><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="2"/>', cls, 'Parcialmente agendado');

/**
 * Icono: Círculo con check relleno — Estado "todo agendado" / Confirmado / Aceptar
 * @param {string} [cls] - Clases CSS adicionales
 * @returns {string} SVG markup
 */
export const iconCheckCircleFill = (cls = '') =>
  svg('<path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>', cls, 'Confirmado');

/**
 * Icono: Círculo con X relleno — Rechazar / Cancelar / Cancelada
 * @param {string} [cls] - Clases CSS adicionales
 * @returns {string} SVG markup
 */
export const iconXCircleFill = (cls = '') =>
  svg('<path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293z"/>', cls, 'Rechazado');

/**
 * Icono: Triángulo de exclamación relleno — Estado "pendiente" / Advertencia
 * @param {string} [cls] - Clases CSS adicionales
 * @returns {string} SVG markup
 */
export const iconExclamationTriangleFill = (cls = '') =>
  svg('<path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>', cls, 'Pendiente');

/**
 * Icono: Slash-circle (⊘) — Estado "bloqueado"
 * @param {string} [cls] - Clases CSS adicionales
 * @returns {string} SVG markup
 */
export const iconSlashCircle = (cls = '') =>
  svg('<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="2"/><line x1="4.1" y1="4.1" x2="11.9" y2="11.9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>', cls, 'Bloqueado');

// ============================================================
// Iconos de Acciones (Botones)
// ============================================================

/**
 * Icono: Más en círculo relleno — Agregar / Nuevo
 * @param {string} [cls] - Clases CSS adicionales
 * @returns {string} SVG markup
 */
export const iconPlusCircleFill = (cls = '') =>
  svg('<path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3z"/>', cls, 'Agregar');

/**
 * Icono: Basura rellena — Eliminar
 * @param {string} [cls] - Clases CSS adicionales
 * @returns {string} SVG markup
 */
export const iconTrashFill = (cls = '') =>
  svg('<path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5M8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5m3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0"/>', cls, 'Eliminar');

/**
 * Icono: Disco flexible — Guardar
 * @param {string} [cls] - Clases CSS adicionales
 * @returns {string} SVG markup
 */
export const iconFloppyFill = (cls = '') =>
  svg('<path d="M0 1.5A1.5 1.5 0 0 1 1.5 0H3v5.5A1.5 1.5 0 0 0 4.5 7h7A1.5 1.5 0 0 0 13 5.5V0h.086a1.5 1.5 0 0 1 1.06.44l1.415 1.414A1.5 1.5 0 0 1 16 2.914V14.5a1.5 1.5 0 0 1-1.5 1.5H14v-5.5A1.5 1.5 0 0 0 12.5 9h-9A1.5 1.5 0 0 0 2 10.5V16h-.5A1.5 1.5 0 0 1 0 14.5zM12 0H4v5.5a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5zm-7.5 10a.5.5 0 0 0-.5.5v5h7v-5a.5.5 0 0 0-.5-.5z"/>', cls, 'Guardar');

/**
 * Icono: Flecha izquierda — Volver
 * @param {string} [cls] - Clases CSS adicionales
 * @returns {string} SVG markup
 */
export const iconArrowLeft = (cls = '') =>
  svg('<path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"/>', cls, 'Volver');

/**
 * Icono: Lápiz cuadrado — Editar
 * @param {string} [cls] - Clases CSS adicionales
 * @returns {string} SVG markup
 */
export const iconPencilFill = (cls = '') =>
  svg('<path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.5.5 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11z"/>', cls, 'Editar');

// ============================================================
// Iconos de Navegación
// ============================================================

/**
 * Icono: Checklist en tarjeta — Solicitudes (nav)
 * @param {string} [cls] - Clases CSS adicionales
 * @returns {string} SVG markup
 */
export const iconCardChecklist = (cls = '') =>
  svg('<path d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2zM5 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 5 8m0-2.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5m0 5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5m-1-5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0M4 8a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0m0 2.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0"/>', cls, 'Solicitudes');

/**
 * Icono: Calendario — Calendario (nav)
 * @param {string} [cls] - Clases CSS adicionales
 * @returns {string} SVG markup
 */
export const iconCalendar3 = (cls = '') =>
  svg('<path d="M14 0H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2M1 3.857C1 3.384 1.448 3 2 3h12c.552 0 1 .384 1 .857v10.286c0 .473-.448.857-1 .857H2c-.552 0-1-.384-1-.857z"/><path d="M6.5 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2m3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2m3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2m-9 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2m3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2m3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2m3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2m-9 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2m3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2m3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2"/>', cls, 'Calendario');

/**
 * Icono: Engranaje relleno — Ajustes (nav)
 * @param {string} [cls] - Clases CSS adicionales
 * @returns {string} SVG markup
 */
export const iconGearFill = (cls = '') =>
  svg('<path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z"/>', cls, 'Ajustes');

/**
 * Icono: Campana rellena — Notificaciones
 * @param {string} [cls] - Clases CSS adicionales
 * @returns {string} SVG markup
 */
export const iconBellFill = (cls = '') =>
  svg('<path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2m.995-14.901a1 1 0 1 0-1.99 0A5 5 0 0 0 3 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7 0-2.42-1.72-4.44-4.005-4.901z"/>', cls, 'Notificaciones');

/**
 * Icono: Bloqueo / candado — Bloqueos
 * @param {string} [cls] - Clases CSS adicionales
 * @returns {string} SVG markup
 */
export const iconLockFill = (cls = '') =>
  svg('<path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>', cls, 'Bloqueo');

/**
 * Icono: Reloj — Horarios
 * @param {string} [cls] - Clases CSS adicionales
 * @returns {string} SVG markup
 */
export const iconClockFill = (cls = '') =>
  svg('<path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71z"/>', cls, 'Horarios');

/**
 * Icono: Personas — Directorio de clientes
 * @param {string} [cls] - Clases CSS adicionales
 * @returns {string} SVG markup
 */
export const iconPeopleFill = (cls = '') =>
  svg('<path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-5.784 6A2.24 2.24 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.3 6.3 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1zM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5"/>', cls, 'Clientes');

/**
 * Icono: Spa / Servicio — Servicios
 * @param {string} [cls] - Clases CSS adicionales
 * @returns {string} SVG markup
 */
export const iconStarFill = (cls = '') =>
  svg('<path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>', cls, 'Servicios');

/**
 * Icono: Hoja — Logo/Brand (alternativa SVG al emoji 🌿)
 * @param {string} [cls] - Clases CSS adicionales
 * @returns {string} SVG markup
 */
export const iconLeaf = (cls = '') =>
  svg('<path d="M8.416.223a.5.5 0 0 0-.832 0l-3 4.5A.5.5 0 0 0 5 5.5h.098L3.076 8.735A.5.5 0 0 0 3.5 9.5h.191l-1.638 3.276a.5.5 0 0 0 .447.724H7v1.5a.5.5 0 0 0 1 0V13.5h4.5a.5.5 0 0 0 .447-.724L11.31 9.5h.191a.5.5 0 0 0 .424-.765L9.902 5.5H10a.5.5 0 0 0 .416-.777z"/>', cls, 'Casa Nei');

/**
 * Icono: Whatsapp estilo — WhatsApp
 * @param {string} [cls] - Clases CSS adicionales
 * @returns {string} SVG markup
 */
export const iconChatDotsFill = (cls = '') =>
  svg('<path d="M16 8c0 3.866-3.582 7-8 7a9 9 0 0 1-2.347-.306c-.584.296-1.925.864-4.181 1.234-.2.032-.352-.176-.273-.362.354-.836.674-1.95.77-2.966C.744 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7M5 8a1 1 0 1 0-2 0 1 1 0 0 0 2 0m4 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0m3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2"/>', cls, 'Chat');
