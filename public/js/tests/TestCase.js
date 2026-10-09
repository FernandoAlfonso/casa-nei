/**
 * @module tests/TestCase
 * Clase base para la ejecución de pruebas unitarias en el frontend.
 * Proporciona métodos de aserción básicos.
 */
export class TestCase {
  constructor() {
    this.assertions = 0;
  }

  /**
   * Método que se ejecuta antes de cada prueba.
   * Sobrescribir en las clases hijas si es necesario.
   */
  setUp() {}

  /**
   * Método que se ejecuta después de cada prueba.
   * Sobrescribir en las clases hijas si es necesario.
   */
  tearDown() {}

  /**
   * Afirma que una condición es verdadera.
   * @param {boolean} condition - Condición a evaluar.
   * @param {string} [message] - Mensaje de error si la aserción falla.
   * @throws {Error} Si la condición no es verdadera.
   */
  assertTrue(condition, message = '') {
    this.assertions++;
    if (!condition) {
      throw new Error(`Failed asserting that value is true. ${message}`);
    }
  }

  /**
   * Afirma que una condición es falsa.
   * @param {boolean} condition - Condición a evaluar.
   * @param {string} [message] - Mensaje de error si la aserción falla.
   * @throws {Error} Si la condición no es falsa.
   */
  assertFalse(condition, message = '') {
    this.assertions++;
    if (condition) {
      throw new Error(`Failed asserting that value is false. ${message}`);
    }
  }

  /**
   * Afirma que dos valores son estrictamente iguales (===).
   * @param {*} expected - El valor esperado.
   * @param {*} actual - El valor real obtenido.
   * @param {string} [message] - Mensaje de error si la aserción falla.
   * @throws {Error} Si los valores no coinciden.
   */
  assertEquals(expected, actual, message = '') {
    this.assertions++;
    if (expected !== actual) {
      throw new Error(`Failed asserting that ${JSON.stringify(expected)} is equal to ${JSON.stringify(actual)}. ${message}`);
    }
  }

  /**
   * Retorna el número de aserciones realizadas.
   * @returns {number}
   */
  getAssertionsCount() {
    return this.assertions;
  }
}
