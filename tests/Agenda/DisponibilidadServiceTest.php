<?php
namespace Tests\Agenda;

use Tests\TestCase;
use App\Agenda\Services\DisponibilidadService;

class DisponibilidadServiceTest extends TestCase
{
    private DisponibilidadService $service;

    public function setUp(): void
    {
        // Se instancia con sus dependencias por defecto que usarán la DB local
        $this->service = new DisponibilidadService();
    }

    public function testFormatearHoraAmPm()
    {
        // Caso básico de la mañana sin minutos
        $this->assertEquals('9am', DisponibilidadService::formatearHoraAmPm('09:00:00'));
        $this->assertEquals('9am', DisponibilidadService::formatearHoraAmPm('09:00'));
        
        // Caso con minutos
        $this->assertEquals('9:30am', DisponibilidadService::formatearHoraAmPm('09:30:00'));
        
        // Tarde
        $this->assertEquals('5pm', DisponibilidadService::formatearHoraAmPm('17:00:00'));
        $this->assertEquals('5:45pm', DisponibilidadService::formatearHoraAmPm('17:45:00'));
        
        // Mediodía / Medianoche
        $this->assertEquals('12pm', DisponibilidadService::formatearHoraAmPm('12:00:00'));
        $this->assertEquals('12am', DisponibilidadService::formatearHoraAmPm('00:00:00'));
    }

    public function testObtenerCalendarioMensualDevuelveFormatoCorrecto()
    {
        $mes = date('Y-m'); // Mes actual
        $calendario = $this->service->obtenerCalendarioMensual($mes);
        
        $this->assertTrue(is_array($calendario), "El calendario mensual debe ser un array");
        
        if (count($calendario) > 0) {
            $primerDia = $calendario[0];
            $this->assertTrue(isset($primerDia['fecha']), "Debe tener una fecha");
            $this->assertTrue(isset($primerDia['estado']), "Debe tener un estado (disponible/ocupado/cerrado/bloqueado)");
            $this->assertTrue(isset($primerDia['nivel_ocupacion']), "Debe tener nivel_ocupacion");
            $this->assertTrue(isset($primerDia['slots_libres']), "Debe tener cantidad de slots libres");
        }
    }
}
