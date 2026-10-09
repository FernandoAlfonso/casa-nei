<?php
namespace Tests;

/**
 * Prueba de ejemplo para validar que el Test Runner de PHP funciona correctamente.
 */
class ExampleTest extends TestCase
{
    /**
     * Prueba básica de aserción verdadera.
     * 
     * @return void
     */
    public function testTrueAssertion(): void
    {
        $this->assertTrue(true, 'Esto siempre debería ser verdadero.');
    }

    /**
     * Prueba básica de igualdad.
     * 
     * @return void
     */
    public function testEquality(): void
    {
        $suma = 2 + 2;
        $this->assertEquals(4, $suma, 'La suma de 2 y 2 debe ser 4.');
    }

    /**
     * Prueba básica de conteo de arreglos.
     * 
     * @return void
     */
    public function testArrayCount(): void
    {
        $arreglo = [1, 2, 3];
        $this->assertCount(3, $arreglo, 'El arreglo debe tener 3 elementos.');
    }
}
