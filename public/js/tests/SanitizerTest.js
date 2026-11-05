import { TestCase } from './TestCase.js';
import { sanitizePhone, isValidMexicanPhone, escapeHtml } from '../agenda/utils/sanitizer.js';

/**
 * @module tests/SanitizerTest
 * Prueba unitaria para las funciones del módulo sanitizer.js
 */
export class SanitizerTest extends TestCase {
  
  testSanitizePhone() {
    const rawPhone = '+52 (312) 106-4455';
    const clean = sanitizePhone(rawPhone);
    this.assertEquals('3121064455', clean, 'Debe remover caracteres no numéricos y normalizar prefijo mexicano +52 a 10 dígitos.');

    const rawPhone521 = '+52 1 (312) 106-4455';
    this.assertEquals('3121064455', sanitizePhone(rawPhone521), 'Debe normalizar prefijo móvil +52 1 a 10 dígitos.');
  }

  testIsValidMexicanPhone() {
    this.assertTrue(isValidMexicanPhone('3121064455'), 'Un número de 10 dígitos debe ser válido.');
    this.assertFalse(isValidMexicanPhone('12345'), 'Un número de menos dígitos debe ser inválido.');
    this.assertTrue(isValidMexicanPhone('+52 (312) 106 4455'), 'Un número mexicano autocompletado con +52 debe normalizarse a 10 dígitos y ser válido.');
  }

  testIsValidMexicanPhoneWithCode() {
    this.assertTrue(isValidMexicanPhone('+52 1 (312) 106-4455'), 'Un número con +52 1 de 13 dígitos debe normalizarse a 10 dígitos y ser válido.');
    this.assertFalse(isValidMexicanPhone('+1 (415) 555-267189'), 'Un número internacional no mexicano de 11+ dígitos no debe ser válido como celular nacional de 10 dígitos.');
  }

  testEscapeHtml() {
    const malicious = '<script>alert("xss")</script>';
    const safe = escapeHtml(malicious);
    this.assertEquals('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;', safe, 'Debe escapar los caracteres HTML.');
  }
}
