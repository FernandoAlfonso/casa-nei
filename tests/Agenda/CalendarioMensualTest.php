<?php
namespace Tests\Agenda;

use Tests\TestCase;
use App\Agenda\Services\DisponibilidadService;
use App\Agenda\Services\AgendaService;
use App\Agenda\Repositories\CitaRepository;
use App\Shared\Db\Database;

/**
 * Pruebas unitarias para la clasificación de ocupación del calendario mensual
 * y el agendamiento administrativo en días extraordinarios (domingos).
 */
class CalendarioMensualTest extends TestCase
{
    private DisponibilidadService $disponibilidadService;
    private AgendaService $agendaService;
    private CitaRepository $citaRepo;
    private ?int $citaCreadaId = null;

    public function setUp(): void
    {
        $this->disponibilidadService = new DisponibilidadService();
        $this->agendaService = new AgendaService();
        $this->citaRepo = new CitaRepository();
    }

    public function tearDown(): void
    {
        if ($this->citaCreadaId !== null) {
            // Limpiar la cita de prueba creada para el domingo
            $db = Database::getInstance();
            $db->execute("DELETE FROM citas WHERE id = :id", ['id' => $this->citaCreadaId]);
            $this->citaCreadaId = null;
        }
    }

    /**
     * Valida que obtenerCalendarioMensual devuelva la estructura completa
     * con clasificación correcta de días según ocupación y citas reales.
     */
    public function testObtenerCalendarioMensualClasificaOcupacionCorrectamente()
    {
        $mes = date('Y-m');
        $calendario = $this->disponibilidadService->obtenerCalendarioMensual($mes);

        $this->assertTrue(is_array($calendario), "El calendario debe ser un array");
        $this->assertTrue(count($calendario) >= 28, "Debe contener al menos 28 días");

        foreach ($calendario as $dia) {
            $this->assertTrue(isset($dia['fecha']), "Cada día debe tener fecha");
            $this->assertTrue(isset($dia['dia_semana']), "Cada día debe tener dia_semana");
            $this->assertTrue(isset($dia['total_citas']), "Cada día debe tener total_citas");
            $this->assertTrue(isset($dia['nivel_ocupacion']), "Cada día debe tener nivel_ocupacion");

            // Validar que el nivel_ocupacion sea uno de los valores válidos
            $nivelesValidos = ['nada agendado', 'parcial', 'todo agendado', 'bloqueado', 'no laboral'];
            $this->assertTrue(
                in_array($dia['nivel_ocupacion'], $nivelesValidos, true),
                "El nivel de ocupación '{$dia['nivel_ocupacion']}' debe ser válido"
            );

            // Si es un día laboral y no tiene citas, debe ser 'nada agendado' (Amarillo)
            if ($dia['dia_semana'] !== 0 && $dia['estado'] === 'disponible' && $dia['total_citas'] === 0) {
                $this->assertEquals('nada agendado', $dia['nivel_ocupacion']);
            }

            // Si es domingo sin citas, debe ser 'no laboral'
            if ($dia['dia_semana'] === 0 && $dia['total_citas'] === 0) {
                $this->assertEquals('no laboral', $dia['nivel_ocupacion']);
            }
        }
    }

    /**
     * Valida que el administrador pueda agendar una cita en domingo sin recibir error
     * de día no laboral, y que dicho domingo se refleje con ocupación parcial en el calendario.
     */
    public function testAdminPuedeAgendarEnDomingo()
    {
        // Encontrar el próximo domingo
        $domingoObj = new \DateTime('next sunday');
        $fechaDomingo = $domingoObj->format('Y-m-d');
        $mesDomingo = $domingoObj->format('Y-m');

        // Agendar cita en domingo como admin
        $resultado = $this->agendaService->agendarCitaAdmin(
            nombreCompleto: "Paciente Prueba Domingo",
            telefono: "3129998877",
            servicioId: 1,
            fechaCita: $fechaDomingo,
            horaInicio: "10:00:00",
            notasAdmin: "Prueba automatizada cita extraordinaria domingo",
            confirmarInmediatamente: true
        );

        $this->assertTrue(isset($resultado['cita_id']), "Debe retornar el ID de la cita creada");
        $this->citaCreadaId = (int) $resultado['cita_id'];
        $this->assertTrue($this->citaCreadaId > 0, "El ID de la cita debe ser mayor a 0");

        // Consultar el calendario mensual y verificar que el domingo ahora tiene citas
        $calendario = $this->disponibilidadService->obtenerCalendarioMensual($mesDomingo);
        $diaEncontrado = null;
        foreach ($calendario as $d) {
            if ($d['fecha'] === $fechaDomingo) {
                $diaEncontrado = $d;
                break;
            }
        }

        $this->assertTrue($diaEncontrado !== null, "El domingo debe existir en el calendario mensual");
        $this->assertTrue($diaEncontrado['total_citas'] >= 1, "El domingo debe reportar al menos 1 cita");
        $this->assertEquals('parcial', $diaEncontrado['nivel_ocupacion'], "El domingo con cita debe tener nivel 'parcial'");
    }
}
