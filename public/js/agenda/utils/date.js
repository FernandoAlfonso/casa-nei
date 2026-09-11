/**
 * Casa Nei - Utilidades de Fecha y Calendario
 * Manejo seguro de husos horarios y formateo en español.
 * @module utils/date
 */

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

/**
 * Parsea una cadena de fecha YYYY-MM-DD a un objeto Date local al mediodía (12:00)
 * para evitar cualquier desfase de día por diferencias de zona horaria o cambios de horario estacional.
 * 
 * @param {string} dateStr - Fecha en formato YYYY-MM-DD.
 * @returns {Date|null} Objeto Date configurado a las 12:00:00 locales, o null si el formato es inválido.
 */
export function parseLocalDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  return new Date(year, month, day, 12, 0, 0);
}

/**
 * Obtiene el nombre corto del día de la semana.
 * @param {number} dayOfWeek - Índice del día (0 = Domingo, 6 = Sábado).
 * @returns {string} Nombre corto del día (ej. "Lun").
 */
export function getDayShortName(dayOfWeek) {
  return DIAS_CORTOS[dayOfWeek] || '';
}

/**
 * Obtiene el nombre completo del día de la semana.
 * @param {number} dayOfWeek - Índice del día (0 = Domingo, 6 = Sábado).
 * @returns {string} Nombre completo del día (ej. "Lunes").
 */
export function getDayFullName(dayOfWeek) {
  return DIAS_LARGOS[dayOfWeek] || '';
}

/**
 * Obtiene el nombre corto del mes.
 * @param {number} monthIndex - Índice del mes (0 = Enero, 11 = Diciembre).
 * @returns {string} Nombre corto del mes (ej. "Sep").
 */
export function getMonthShortName(monthIndex) {
  return MESES_CORTOS[monthIndex] || '';
}

/**
 * Obtiene el nombre completo del mes en minúsculas para redacción natural en español.
 * @param {number} monthIndex - Índice del mes (0 = Enero, 11 = Diciembre).
 * @returns {string} Nombre completo del mes (ej. "septiembre").
 */
export function getMonthFullName(monthIndex) {
  return MESES_LARGOS[monthIndex] || '';
}

/**
 * Formatea una fecha YYYY-MM-DD a formato amigable en español.
 * Ejemplo: "Jueves 3 de septiembre de 2026".
 * 
 * @param {string} dateStr - Fecha en formato YYYY-MM-DD.
 * @returns {string} Fecha formateada legible en español.
 */
export function formatDateLegible(dateStr) {
  const dateObj = parseLocalDate(dateStr);
  if (!dateObj) return dateStr || '';

  const diaSemana = getDayFullName(dateObj.getDay());
  const diaMes = dateObj.getDate();
  const mes = getMonthFullName(dateObj.getMonth());
  const anio = dateObj.getFullYear();

  return `${diaSemana} ${diaMes} de ${mes} de ${anio}`;
}

/**
 * Formatea una fecha YYYY-MM-DD a formato accesible para lectores de pantalla.
 * Ejemplo: "Jueves 3 de septiembre".
 * 
 * @param {string} dateStr - Fecha en formato YYYY-MM-DD.
 * @returns {string} Texto accesible.
 */
export function formatDateAccessible(dateStr) {
  const dateObj = parseLocalDate(dateStr);
  if (!dateObj) return dateStr || '';

  const diaSemana = getDayFullName(dateObj.getDay());
  const diaMes = dateObj.getDate();
  const mes = getMonthFullName(dateObj.getMonth());

  return `${diaSemana} ${diaMes} de ${mes}`;
}

/**
 * Formatea una hora en formato HH:MM o HH:MM:SS al formato compacto natural AM/PM (ej. "5pm", "1am", "9am", "5:30pm").
 * Omite los minutos si es hora en punto (:00) y los conserva si existen fracciones de hora.
 * 
 * @param {string} timeStr - Hora en formato "HH:MM" o "HH:MM:SS".
 * @returns {string} Hora formateada en minúsculas y sin espacio (ej. "5pm", "1am", "5:30pm").
 */
export function formatTimeAmPm(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return '';
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return timeStr;

  let hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes)) return timeStr;

  const suffix = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  if (hours === 0) hours = 12;

  const minStr = minutes > 0 ? `:${minutes.toString().padStart(2, '0')}` : '';
  return `${hours}${minStr}${suffix}`;
}
