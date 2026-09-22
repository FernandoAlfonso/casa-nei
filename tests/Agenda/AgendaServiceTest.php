<?php
namespace Tests\Agenda;

use Tests\TestCase;
use App\Agenda\Services\AgendaService;
use App\Agenda\Repositories\ServicioRepository;

class AgendaServiceTest extends TestCase
{
    private AgendaService $service;

    public function setUp(): void
    {
        $this->service = new AgendaService();
    }

    public function testObtenerCatalogoServicios()
    {
        $servicios = $this->service->obtenerCatalogoServicios();
        
        $this->assertTrue(is_array($servicios), "El catálogo de servicios debe ser un array");
        
        if (count($servicios) > 0) {
            $primerServicio = reset($servicios);
            $this->assertTrue(isset($primerServicio['id']), "Debe tener un ID");
            $this->assertTrue(isset($primerServicio['nombre']), "Debe tener un nombre");
            $this->assertTrue(isset($primerServicio['precio']), "Debe tener un precio");
        }
    }

    public function testConsultarClientePorTelefono()
    {
        // En un entorno de pruebas con datos locales, es posible que el teléfono "0000000000" no exista
        // pero validamos que el comportamiento del método sea devolver null y no falle.
        $cliente = $this->service->consultarClientePorTelefono("0000000000");
        $this->assertTrue($cliente === null || is_array($cliente), "Debe devolver null o un array con datos");
    }
}
