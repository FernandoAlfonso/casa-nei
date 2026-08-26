<?php

namespace App\Agenda\Services;

use App\Agenda\Entities\EstadoCita;
use App\Agenda\Repositories\CitaRepository;
use App\Agenda\Repositories\HorarioRepository;
use App\Agenda\Repositories\ServicioRepository;
use DateTime;
use DateInterval;
use DatePeriod;

/**
 * DisponibilidadService - Motor de cálculo para disponibilidad de fechas y horarios.
 */
class DisponibilidadService
{
  public function __construct(
    private HorarioRepository $horarioRepo = new HorarioRepository(),
    private CitaRepository $citaRepo = new CitaRepository(),
    private ServicioRepository $servicioRepo = new ServicioRepository()
  ) {
  }

  /**
   * Obtiene la disponibilidad del calendario para las próximas N semanas a partir de una fecha.
   *
   * @param string|null $fechaDesde Fecha inicial en formato YYYY-MM-DD (por defecto hoy)
   * @param int $semanasAdelante Número de semanas hacia el futuro (por defecto 4)
   * @param int|null $servicioId ID del servicio para calcular duración (opcional)
   * @return array Resumen de días con su estado ('disponible', 'ocupado', 'bloqueado', 'cerrado', 'tiene_pendientes')
   */
  public function obtenerCalendario(
    ?string $fechaDesde = null,
    int $semanasAdelante = 4,
    ?int $servicioId = null
  ): array {
    $inicio = new DateTime($fechaDesde ?? 'today');
    $diasTotales = $semanasAdelante * 7;
    $fin = (clone $inicio)->modify("+{$diasTotales} days");

    $fechaInicioStr = $inicio->format('Y-m-d');
    $fechaFinStr = $fin->format('Y-m-d');

    // Cargar horarios semanales, bloqueos y citas en el rango
    $horariosSemanales = [];
    foreach ($this->horarioRepo->obtenerHorariosSemanales() as $h) {
      $horariosSemanales[$h->getDiaSemana()] = $h;
    }

    $bloqueos = $this->horarioRepo->obtenerBloqueosEnRango($fechaInicioStr, $fechaFinStr);
    $bloqueosPorFecha = [];
    foreach ($bloqueos as $b) {
      $bloqueosPorFecha[$b->getFecha()][] = $b;
    }

    $citas = $this->citaRepo->obtenerPorRangoFechas($fechaInicioStr, $fechaFinStr, [
      EstadoCita::PENDIENTE->value,
      EstadoCita::CONFIRMADA->value
    ]);
    $citasPorFecha = [];
    foreach ($citas as $c) {
      $citasPorFecha[$c->getFechaCita()][] = $c;
    }

    // Duración base en minutos para calcular capacidad (por defecto 60 min si no se pasa servicio)
    $duracionMinutos = 60;
    if ($servicioId !== null) {
      $servicio = $this->servicioRepo->buscarPorId($servicioId);
      if ($servicio) {
        $duracionMinutos = $servicio->getDuracionMinutos();
      }
    }

    $periodo = new DatePeriod($inicio, new DateInterval('P1D'), (clone $fin)->modify('+1 day'));
    $calendario = [];

    foreach ($periodo as $fechaObj) {
      $fechaStr = $fechaObj->format('Y-m-d');
      $diaSemana = (int) $fechaObj->format('w'); // 0=Domingo, 1=Lunes, etc.

      // 1. Validar si el centro abre ese día de la semana
      if (!isset($horariosSemanales[$diaSemana])) {
        $calendario[$fechaStr] = [
          'fecha' => $fechaStr,
          'dia_semana' => $diaSemana,
          'estado' => 'cerrado',
          'motivo' => 'Día no laboral',
          'slots_libres' => 0,
          'tiene_pendientes' => false
        ];
        continue;
      }

      $horarioDia = $horariosSemanales[$diaSemana];

      // 2. Validar si hay un bloqueo total de todo el día
      $bloqueosDia = $bloqueosPorFecha[$fechaStr] ?? [];
      $bloqueoCompleto = null;
      foreach ($bloqueosDia as $b) {
        if ($b->esDiaCompleto()) {
          $bloqueoCompleto = $b;
          break;
        }
      }

      if ($bloqueoCompleto !== null) {
        $calendario[$fechaStr] = [
          'fecha' => $fechaStr,
          'dia_semana' => $diaSemana,
          'estado' => 'bloqueado',
          'motivo' => $bloqueoCompleto->getMotivo() ?? 'No disponible',
          'slots_libres' => 0,
          'tiene_pendientes' => false
        ];
        continue;
      }

      // 3. Calcular slots libres del día
      $slots = $this->generarSlotsDisponibles(
        $fechaStr,
        $horarioDia->getHoraInicio(),
        $horarioDia->getHoraFin(),
        $duracionMinutos,
        $bloqueosDia,
        $citasPorFecha[$fechaStr] ?? []
      );

      $citasDia = $citasPorFecha[$fechaStr] ?? [];
      $tienePendientes = false;
      foreach ($citasDia as $c) {
        if ($c->estaPendiente()) {
          $tienePendientes = true;
          break;
        }
      }

      $estado = count($slots) > 0 ? 'disponible' : 'ocupado';

      $calendario[$fechaStr] = [
        'fecha' => $fechaStr,
        'dia_semana' => $diaSemana,
        'estado' => $estado,
        'motivo' => count($slots) === 0 ? 'Sin horarios disponibles' : null,
        'slots_libres' => count($slots),
        'tiene_pendientes' => $tienePendientes
      ];
    }

    return $calendario;
  }

  /**
   * Obtiene la lista de horarios específicos disponibles para un día dado y servicio.
   *
   * @param string $fecha Formato YYYY-MM-DD
   * @param int $servicioId
   * @return array Lista de rangos disponibles: [['hora_inicio' => '09:00', 'hora_fin' => '10:00'], ...]
   */
  public function obtenerHorasDisponibles(string $fecha, int $servicioId): array
  {
    $servicio = $this->servicioRepo->buscarPorId($servicioId);
    if (!$servicio || !$servicio->isActivo()) {
      return [];
    }

    $fechaObj = new DateTime($fecha);
    $diaSemana = (int) $fechaObj->format('w');

    $horarioDia = $this->horarioRepo->obtenerPorDiaSemana($diaSemana);
    if (!$horarioDia) {
      return [];
    }

    $bloqueos = $this->horarioRepo->obtenerBloqueosEnRango($fecha, $fecha);
    foreach ($bloqueos as $b) {
      if ($b->esDiaCompleto()) {
        return [];
      }
    }

    $citas = $this->citaRepo->obtenerPorRangoFechas($fecha, $fecha, [
      EstadoCita::PENDIENTE->value,
      EstadoCita::CONFIRMADA->value
    ]);

    return $this->generarSlotsDisponibles(
      $fecha,
      $horarioDia->getHoraInicio(),
      $horarioDia->getHoraFin(),
      $servicio->getDuracionMinutos(),
      $bloqueos,
      $citas
    );
  }

  /**
   * Divide el horario laboral en intervalos y descuenta citas y bloqueos existentes.
   */
  private function generarSlotsDisponibles(
    string $fecha,
    string $horaApertura,
    string $horaCierre,
    int $duracionMinutos,
    array $bloqueos,
    array $citas
  ): array {
    $slots = [];
    $actual = new DateTime("{$fecha} {$horaApertura}");
    $cierre = new DateTime("{$fecha} {$horaCierre}");
    $ahora = new DateTime();

    while ($actual < $cierre) {
      $finSlot = (clone $actual)->modify("+{$duracionMinutos} minutes");

      // Si el slot excede la hora de cierre del negocio, se descarta
      if ($finSlot > $cierre) {
        break;
      }

      // Si la fecha es hoy y la hora ya pasó, se descarta
      if ($actual <= $ahora) {
        $actual->modify("+{$duracionMinutos} minutes");
        continue;
      }

      $horaInicioStr = $actual->format('H:i:s');
      $horaFinStr = $finSlot->format('H:i:s');

      // Validar colisión con bloqueos parciales
      $colisionBloqueo = false;
      foreach ($bloqueos as $bloqueo) {
        if ($bloqueo->getHoraInicio() && $bloqueo->getHoraFin()) {
          if ($this->hayTraslape($horaInicioStr, $horaFinStr, $bloqueo->getHoraInicio(), $bloqueo->getHoraFin())) {
            $colisionBloqueo = true;
            break;
          }
        }
      }

      if ($colisionBloqueo) {
        $actual->modify("+{$duracionMinutos} minutes");
        continue;
      }

      // Validar colisión con citas agendadas (pendientes o confirmadas)
      $colisionCita = false;
      foreach ($citas as $cita) {
        if ($this->hayTraslape($horaInicioStr, $horaFinStr, $cita->getHoraInicio(), $cita->getHoraFin())) {
          $colisionCita = true;
          break;
        }
      }

      if (!$colisionCita) {
        $slots[] = [
          'hora_inicio' => $actual->format('H:i'),
          'hora_fin' => $finSlot->format('H:i'),
          'hora_inicio_completa' => $horaInicioStr,
          'hora_fin_completa' => $horaFinStr
        ];
      }

      $actual->modify("+{$duracionMinutos} minutes");
    }

    return $slots;
  }

  /**
   * Comprueba si dos rangos de horas se traslapan.
   */
  private function hayTraslape(string $inicioA, string $finA, string $inicioB, string $finB): bool
  {
    return ($inicioA < $finB) && ($finA > $inicioB);
  }
}
