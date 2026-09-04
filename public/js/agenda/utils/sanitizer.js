/**
 * Casa Nei - Utilidades de Sanitización y Validación
 * @module utils/sanitizer
 */

/**
 * Escapa caracteres HTML especiales para mitigar vulnerabilidades XSS.
 * @param {string|null|undefined} str - Cadena de texto a escapar.
 * @returns {string} Cadena de texto con entidades HTML seguras.
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const stringVal = String(str);
  return stringVal.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m] || m);
}

/**
 * Normaliza un número de teléfono extrayendo exclusivamente los dígitos numéricos.
 * @param {string} phone - Número de teléfono en cualquier formato.
 * @returns {string} Dígitos numéricos limpios.
 */
export function sanitizePhone(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
}

/**
 * Valida si un número telefónico cumple con el formato estándar mexicano de 10 dígitos.
 * @param {string} phone - Número telefónico limpio o sin limpiar.
 * @returns {boolean} Verdadero si contiene exactamente 10 dígitos numéricos.
 */
export function isValidMexicanPhone(phone) {
  const digits = sanitizePhone(phone);
  return /^[0-9]{10}$/.test(digits);
}

/**
 * Valida que una URL de WhatsApp pertenezca a los dominios oficiales de WhatsApp.
 * @param {string} url - URL generada para redirección de WhatsApp.
 * @returns {boolean} Verdadero si la URL es segura y pertenece a WhatsApp.
 */
export function isSafeWhatsAppUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    const validHosts = ['wa.me', 'api.whatsapp.com', 'web.whatsapp.com'];
    return parsed.protocol === 'https:' && validHosts.includes(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}
