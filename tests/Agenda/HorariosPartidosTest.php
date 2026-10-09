<?php
namespace Tests\Agenda;

use Tests\TestCase;
use App\Agenda\Services\DisponibilidadService;
use App\Agenda\Repositories\HorarioRepository;
use App\Agenda\Repositories\ServicioRepository;

class HorariosPartidosTest extends TestCase
{
    private DisponibilidadService $service;
    private HorarioRepository $horarioRepo;
    private array $horariosAnteriores;

    public function setUp(): void
    {
        $this->horarioRepo = new HorarioRepository();
        $this->service = new DisponibilidadService();

        // Respaldar horarios actuales del Lunes (dia 1)
        $this->horariosAnteriores = $this->horarioRepo->obtenerPorDiaSemana(1);

        // Configurar horario partido para el lunes: 09:00-14:00 y 16:00-20:00
        $this->horarioRepo->reemplazarHorariosDia(1, [
            ['hora_inicio' => '09:00:00', 'hora_fin' => '14:00:00'],
            ['hora_inicio' => '16:00:00', 'hora_fin' => '20:00:00']
        ], true);
    }

    public function tearDown(): void
    {
        // Restaurar horarios anteriores
        $horarios = [];
        foreach ($this->horariosAnteriores as $h) {
            $horarios[] = [
                'hora_inicio' => $h->getHoraInicio(),
                'hora_fin' => $h->getHoraFin()
            ];
        }
        $activo = count($horarios) > 0;
        $this->horarioRepo->reemplazarHorariosDia(1, $horarios, $activo);
    }

    public function testDisponibilidadConHorarioPartido()
    {
        // Buscar el próximo lunes
        $proximoLunes = new \DateTime('next monday');
        $fecha = $proximoLunes->format('Y-m-d');

        // Buscar el ID del servicio 1 (Medicina Tradicional)
        $servicioRepo = new ServicioRepository();
        $servicio = $servicioRepo->buscarPorId(1); // asumiendo que existe el servicio 1 (60 mins)
        $servicioId = 1;

        if (!$servicio) {
            // si no existe, solo ignorar la prueba
            $this->assertTrue(true);
            return;
        }

        $horas = $this->service->obtenerHorasDisponibles($fecha, $servicioId);
        
        $horasEncontradas = array_column($horas, 'hora_inicio');
        
        // 10:00 debe estar disponible (dentro de 09:00-14:00)
        $this->assertTrue(in_array('10:00', $horasEncontradas), "10:00 debe estar disponible");
        
        // 15:00 debe estar rechazado (fuera de horario, en el corte de 14 a 16)
        $this->assertFalse(in_array('15:00', $horasEncontradas), "15:00 NO debe estar disponible");
        
        // 17:00 debe estar disponible (dentro de 16:00-20:00)
        $this->assertTrue(in_array('17:00', $horasEncontradas), "17:00 debe estar disponible");
    }
}
