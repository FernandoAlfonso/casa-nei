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
    this.assertEquals('523121064455', clean, 'Debe remover todos los caracteres no numéricos.');
  }

  testIsValidMexicanPhone() {
    this.assertTrue(isValidMexicanPhone('3121064455'), 'Un número de 10 dígitos debe ser válido.');
    this.assertFalse(isValidMexicanPhone('12345'), 'Un número de menos dígitos debe ser inválido.');
    this.assertFalse(isValidMexicanPhone('+52 (312) 106 4455'), 'Un número formateado que contiene 10 dígitos principales no será válido si incluye el +52. Según sanitizePhone queda de 12.');
    // Nota: Si sanitizePhone deja "523121064455", entonces isValidMexicanPhone('+52 (312) 106 4455') dará FALSO porque exige exactamente 10 dígitos.
  }

  testIsValidMexicanPhoneWithCode() {
    // La función original espera exactamente 10 dígitos al limpiar.
    // +52... resultaría en 12 dígitos.
    this.assertFalse(isValidMexicanPhone('+52 (312) 106-4455'), 'Debería ser falso porque con el código de país son 12 dígitos y la regex pide 10.');
  }

  testEscapeHtml() {
    const malicious = '<script>alert("xss")</script>';
    const safe = escapeHtml(malicious);
    this.assertEquals('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;', safe, 'Debe escapar los caracteres HTML.');
  }
}
