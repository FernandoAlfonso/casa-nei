<?php
namespace Tests;

/**
 * Clase base para la ejecución de pruebas unitarias y funcionales sencillas.
 * Proporciona métodos de aserción básicos para validar el comportamiento del código.
 */
class TestCase
{
    /**
     * Contador de aserciones realizadas durante una prueba.
     * @var int
     */
    protected int $assertions = 0;
    
    /**
     * Método de configuración que se ejecuta antes de cada prueba.
     * Sobrescribir en las clases hijas para inicializar estados.
     * 
     * @return void
     */
    public function setUp(): void {}

    /**
     * Método de limpieza que se ejecuta después de cada prueba.
     * Sobrescribir en las clases hijas para liberar recursos.
     * 
     * @return void
     */
    public function tearDown(): void {}

    /**
     * Afirma que una condición dada es verdadera.
     * 
     * @param bool $condition Condición a evaluar.
     * @param string $message Mensaje opcional a mostrar si la aserción falla.
     * @throws \Exception Si la condición no es verdadera.
     * @return void
     */
    protected function assertTrue(bool $condition, string $message = ''): void
    {
        $this->assertions++;
        if (!$condition) {
            throw new \Exception("Failed asserting that value is true. " . $message);
        }
    }

    /**
     * Afirma que una condición dada es falsa.
     * 
     * @param bool $condition Condición a evaluar.
     * @param string $message Mensaje opcional a mostrar si la aserción falla.
     * @throws \Exception Si la condición no es falsa.
     * @return void
     */
    protected function assertFalse(bool $condition, string $message = ''): void
    {
        $this->assertions++;
        if ($condition) {
            throw new \Exception("Failed asserting that value is false. " . $message);
        }
    }

    /**
     * Afirma que dos valores son iguales. Utiliza comparación estricta (===).
     * 
     * @param mixed $expected El valor esperado.
     * @param mixed $actual El valor actual obtenido.
     * @param string $message Mensaje opcional a mostrar si la aserción falla.
     * @throws \Exception Si los valores no coinciden.
     * @return void
     */
    protected function assertEquals(mixed $expected, mixed $actual, string $message = ''): void
    {
        $this->assertions++;
        if ($expected !== $actual) {
            throw new \Exception("Failed asserting that " . var_export($expected, true) . " is equal to " . var_export($actual, true) . ". " . $message);
        }
    }

    /**
     * Afirma que un arreglo o contable tiene una cantidad específica de elementos.
     * 
     * @param int $expectedCount La cantidad de elementos esperados.
     * @param array|\Countable $haystack El arreglo o elemento contable a evaluar.
     * @param string $message Mensaje opcional a mostrar si la aserción falla.
     * @throws \Exception Si la cantidad de elementos no coincide.
     * @return void
     */
    protected function assertCount(int $expectedCount, array|\Countable $haystack, string $message = ''): void
    {
        $this->assertions++;
        $actualCount = count($haystack);
        if ($expectedCount !== $actualCount) {
            throw new \Exception("Failed asserting that size $actualCount matches expected size $expectedCount. " . $message);
        }
    }

    /**
     * Obtiene el total de aserciones realizadas en la instancia actual.
     * 
     * @return int
     */
    public function getAssertionsCount(): int
    {
        return $this->assertions;
    }
}
