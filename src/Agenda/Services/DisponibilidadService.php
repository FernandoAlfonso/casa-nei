<?php

namespace App\Agenda\Services;

use App\Agenda\Entities\BloqueoAgenda;
use App\Agenda\Entities\EstadoCita;
use App\Agenda\Entities\HorarioAtencion;
use App\Agenda\Entities\Servicio;
use App\Agenda\Repositories\CitaRepository;
use App\Agenda\Repositories\HorarioRepository;
use App\Agenda\Repositories\ServicioRepository;
use DateInterval;
use DatePeriod;
use DateTime;

/**
 * Class DisponibilidadService
 *
 * Motor de cálculo de disponibilidad de fechas y slots horarios para Casa Nei.
 * Evalúa los horarios de atención semanales, los bloqueos por festivos o vacaciones
 * y las citas existentes para proyectar la disponibilidad en tiempo real.
 *
 * Optimizado para dispositivos móviles:
 * - Capacidad de precargar slots en la misma respuesta del calendario (`con_slots=1`).
 * - Formato amigable de horas precalculado (`hora_inicio_formato`, `etiqueta`).
 *
 * @package App\Agenda\Services
 */
class DisponibilidadService
{
  /**
   * Repositorio de horarios semanales y bloqueos de agenda.
   */
  private HorarioRepository $horarioRepo;

  /**
   * Repositorio de citas y reservas.
   */
  private CitaRepository $citaRepo;

  /**
   * Repositorio de servicios y duraciones.
   */
  private ServicioRepository $servicioRepo;

  /**
   * Constructor del servicio con soporte de inyección de dependencias.
   *
   * @param HorarioRepository|null $horarioRepo
   * @param CitaRepository|null $citaRepo
   * @param ServicioRepository|null $servicioRepo
   */
  public function __construct(
    ?HorarioRepository $horarioRepo = null,
    ?CitaRepository $citaRepo = null,
    ?ServicioRepository $servicioRepo = null
  ) {
    $this->horarioRepo = $horarioRepo ?? new HorarioRepository();
    $this->citaRepo = $citaRepo ?? new CitaRepository();
    $this->servicioRepo = $servicioRepo ?? new ServicioRepository();
  }

  /**
   * Obtiene la disponibilidad del calendario para las próximas N semanas a partir de una fecha.
   *
   * @param string|null $fechaDesde Fecha inicial en formato YYYY-MM-DD (por defecto hoy).
   * @param int $semanasAdelante Número de semanas hacia el futuro (por defecto 2).
   * @param int|null $servicioId ID del servicio para calcular duración (opcional).
   * @param bool $soloDisponibles Si es true, retorna solo días con disponibilidad garantizada.
   * @param bool $conSlots Si es true, incrusta los horarios disponibles en cada día (ahorra roundtrips móviles).
   * @return array<string|int, array<string, mixed>> Resumen de días con su estado.
   */
  public function obtenerCalendario(
    ?string $fechaDesde = null,
    int $semanasAdelante = 2,
    ?int $servicioId = null,
    bool $soloDisponibles = false,
    bool $conSlots = false
  ): array {
    if ($soloDisponibles) {
      $diasObjetivo = $semanasAdelante * 6; // 6 días laborables por semana (Lunes a Sábado) = 12 días para 2 semanas
      return $this->obtenerDiasDisponibles($fechaDesde, $diasObjetivo, $servicioId, $conSlots);
    }

    $inicio = new DateTime($fechaDesde ?? 'today');
    $diasTotales = $semanasAdelante * 7;
    $fin = (clone $inicio)->modify("+{$diasTotales} days");

    $fechaInicioStr = $inicio->format('Y-m-d');
    $fechaFinStr = $fin->format('Y-m-d');

    $datos = $this->cargarDatosRango($fechaInicioStr, $fechaFinStr);
    $horariosSemanales = $datos['horarios_semanales'];
    $bloqueosPorFecha = $datos['bloqueos_por_fecha'];
    $citasPorFecha = $datos['citas_por_fecha'];

    $servicio = $servicioId !== null ? $this->servicioRepo->buscarPorId($servicioId) : null;
    $duracionMinutos = $servicio ? $servicio->getDuracionMinutos() : $this->resolverDuracionServicio($servicioId);

    $periodo = new DatePeriod($inicio, new DateInterval('P1D'), (clone $fin)->modify('+1 day'));
    $calendario = [];

    foreach ($periodo as $fechaObj) {
      $fechaStr = $fechaObj->format('Y-m-d');
      $diaSemana = (int) $fechaObj->format('w'); // 0=Domingo, 1=Lunes, etc.

      // 1. Determinar turnos del día aplicando herencia con sobrescritura
      $horariosDia = $this->resolverTurnosDia($diaSemana, $servicio, $horariosSemanales);
      if (empty($horariosDia)) {
        $motivoCerrado = ($servicio !== null && $servicio->tieneHorarioPersonalizado())
          ? 'Servicio no disponible este día'
          : 'Día no laboral';

        $calendario[$fechaStr] = $this->construirDatosDia(
          $fechaStr,
          $diaSemana,
          'cerrado',
          $motivoCerrado,
          0,
          false,
          $conSlots,
          []
        );
        continue;
      }
      $bloqueosDia = $bloqueosPorFecha[$fechaStr] ?? [];
      $bloqueoCompleto = $this->buscarBloqueoCompleto($bloqueosDia);

      // 2. Validar si hay un bloqueo total de todo el día
      if ($bloqueoCompleto !== null) {
        $calendario[$fechaStr] = $this->construirDatosDia(
          $fechaStr,
          $diaSemana,
          'bloqueado',
          $bloqueoCompleto->getMotivo() ?? 'No disponible',
          0,
          false,
          $conSlots,
          []
        );
        continue;
      }

      $citasDia = $citasPorFecha[$fechaStr] ?? [];

      // 3. Calcular slots libres del día
      $slots = [];
      foreach ($horariosDia as $turno) {
        $slotsTurno = $this->generarSlotsDisponibles(
          $fechaStr,
          $turno->getHoraInicio(),
          $turno->getHoraFin(),
          $duracionMinutos,
          $bloqueosDia,
          $citasDia
        );
        $slots = array_merge($slots, $slotsTurno);
      }

      $tienePendientes = $this->hayPendientes($citasDia);
      $estado = count($slots) > 0 ? 'disponible' : 'ocupado';
      $motivo = count($slots) === 0 ? 'Sin horarios disponibles' : null;

      $calendario[$fechaStr] = $this->construirDatosDia(
        $fechaStr,
        $diaSemana,
        $estado,
        $motivo,
        count($slots),
        $tienePendientes,
        $conSlots,
        $slots
      );
    }

    return $calendario;
  }

  /**
   * Obtiene la disponibilidad resumida para todo un mes, ideal para la vista minimalista administrativa.
   *
   * @param string $mes Formato YYYY-MM
   * @return array<int, array<string, mixed>>
   */
  public function obtenerCalendarioMensual(string $mes): array
  {
    $inicioMes = new DateTime("{$mes}-01");
    $finMes = clone $inicioMes;
    $finMes->modify('last day of this month');

    $fechaInicioStr = $inicioMes->format('Y-m-d');
    $fechaFinStr = $finMes->format('Y-m-d');

    $datos = $this->cargarDatosRango($fechaInicioStr, $fechaFinStr);
    $horariosSemanales = $datos['horarios_semanales'];
    $bloqueosPorFecha = $datos['bloqueos_por_fecha'];
    $citasPorFecha = $datos['citas_por_fecha'];

    $periodo = new DatePeriod($inicioMes, new DateInterval('P1D'), (clone $finMes)->modify('+1 day'));
    $mesData = [];

    foreach ($periodo as $fechaObj) {
      $fechaStr = $fechaObj->format('Y-m-d');
      $diaSemana = (int) $fechaObj->format('w'); // 0=Domingo, 1=Lunes, ...
      $citasDia = $citasPorFecha[$fechaStr] ?? [];
      $bloqueosDia = $bloqueosPorFecha[$fechaStr] ?? [];
      $totalCitas = count($citasDia);
      $tienePendientes = $this->hayPendientes($citasDia);

      // Validar si hay bloqueo de día completo
      $bloqueoCompleto = $this->buscarBloqueoCompleto($bloqueosDia);
      if ($bloqueoCompleto !== null) {
        $mesData[] = [
          'fecha' => $fechaStr,
          'dia_semana' => $diaSemana,
          'estado' => 'bloqueado',
          'motivo' => $bloqueoCompleto->getMotivo() ?? 'Bloqueado',
          'slots_libres' => 0,
          'total_citas' => $totalCitas,
          'capacidad_total' => 0,
          'tiene_pendientes' => $tienePendientes,
          'nivel_ocupacion' => 'bloqueado'
        ];
        continue;
      }

      // Validar si el centro abre regularmente ese día de la semana
      $esDiaLaboral = isset($horariosSemanales[$diaSemana]);

      if (!$esDiaLaboral) {
        // Domingo u otro día sin turnos regulares
        if ($totalCitas > 0) {
          // Día no laboral pero con citas especiales agendadas por el admin
          $mesData[] = [
            'fecha' => $fechaStr,
            'dia_semana' => $diaSemana,
            'estado' => 'disponible',
            'motivo' => 'Citas especiales agendadas',
            'slots_libres' => 0,
            'total_citas' => $totalCitas,
            'capacidad_total' => $totalCitas,
            'tiene_pendientes' => $tienePendientes,
            'nivel_ocupacion' => 'parcial' // Al menos una cita agendada
          ];
        } else {
          // No laboral sin citas
          $mesData[] = [
            'fecha' => $fechaStr,
            'dia_semana' => $diaSemana,
            'estado' => 'cerrado',
            'motivo' => 'Día no laboral',
            'slots_libres' => 0,
            'total_citas' => 0,
            'capacidad_total' => 0,
            'tiene_pendientes' => false,
            'nivel_ocupacion' => 'no laboral'
          ];
        }
        continue;
      }

      // Día laboral regular: calcular capacidad y slots libres reales
      $horariosDia = $horariosSemanales[$diaSemana];
      $calculo = $this->calcularSlotsDiaAdmin($fechaStr, $horariosDia, $bloqueosDia, $citasDia, 60);
      $capacidad = $calculo['capacidad'];
      $slotsLibres = $calculo['slots_libres'];

      $ocupacion = $this->determinarOcupacionDiaAdmin($capacidad, $slotsLibres, $totalCitas, $bloqueosDia);

      $mesData[] = [
        'fecha' => $fechaStr,
        'dia_semana' => $diaSemana,
        'estado' => $ocupacion['estado'],
        'motivo' => $ocupacion['motivo'],
        'slots_libres' => $slotsLibres,
        'total_citas' => $totalCitas,
        'capacidad_total' => $capacidad,
        'tiene_pendientes' => $tienePendientes,
        'nivel_ocupacion' => $ocupacion['nivel_ocupacion']
      ];
    }

    return $mesData;
  }

  /**
   * Obtiene una lista garantizada de N días netos disponibles a partir de una fecha inicial.
   * Recorre dinámicamente el calendario hacia el futuro saltando domingos (cerrados), bloqueos
   * festivos y días ocupados hasta completar exactamente la cantidad solicitada (ej. 12 días = 2 semanas completas de Lun a Sáb).
   *
   * @param string|null $fechaDesde Fecha inicial en formato YYYY-MM-DD (por defecto hoy).
   * @param int $cantidadDias Cantidad garantizada de días disponibles a retornar (por defecto 12).
   * @param int|null $servicioId ID del servicio para calcular duración y slots.
   * @param bool $conSlots Si es true, incrusta los horarios disponibles en cada día (ahorra roundtrips móviles).
   * @return array<int, array<string, mixed>> Lista indexada con los N días disponibles encontrados.
   */
  public function obtenerDiasDisponibles(
    ?string $fechaDesde = null,
    int $cantidadDias = 12,
    ?int $servicioId = null,
    bool $conSlots = false
  ): array {
    $inicio = new DateTime($fechaDesde ?? 'today');
    $servicio = $servicioId !== null ? $this->servicioRepo->buscarPorId($servicioId) : null;
    $duracionMinutos = $servicio ? $servicio->getDuracionMinutos() : $this->resolverDuracionServicio($servicioId);

    $diasEncontrados = [];
    $cursor = clone $inicio;

    // Límite de seguridad de 180 días hacia el futuro para prevenir bucles si hubiera un cierre extraordinario prolongado
    $limiteMaximo = (clone $inicio)->modify('+180 days');

    // Consultamos en bloques de 30 días para evitar consultas SQL día a día (evita latencia de red N+1)
    $bloqueDias = 30;

    while (count($diasEncontrados) < $cantidadDias && $cursor < $limiteMaximo) {
      $finBloque = (clone $cursor)->modify("+{$bloqueDias} days");
      if ($finBloque > $limiteMaximo) {
        $finBloque = clone $limiteMaximo;
      }

      $fechaInicioStr = $cursor->format('Y-m-d');
      $fechaFinStr = $finBloque->format('Y-m-d');

      $datos = $this->cargarDatosRango($fechaInicioStr, $fechaFinStr);
      $horariosSemanales = $datos['horarios_semanales'];
      $bloqueosPorFecha = $datos['bloqueos_por_fecha'];
      $citasPorFecha = $datos['citas_por_fecha'];

      $periodo = new DatePeriod($cursor, new DateInterval('P1D'), (clone $finBloque)->modify('+1 day'));

      foreach ($periodo as $fechaObj) {
        $fechaStr = $fechaObj->format('Y-m-d');
        $diaSemana = (int) $fechaObj->format('w'); // 0=Domingo, 1=Lunes, ..., 6=Sábado

        // 1. Omitir si el negocio o servicio no opera ese día de la semana
        $horariosDia = $this->resolverTurnosDia($diaSemana, $servicio, $horariosSemanales);
        if (empty($horariosDia)) {
          continue;
        }

        $bloqueosDia = $bloqueosPorFecha[$fechaStr] ?? [];

        // 2. Omitir si hay un bloqueo de día completo (ej. festivos, vacaciones)
        if ($this->buscarBloqueoCompleto($bloqueosDia) !== null) {
          continue;
        }

        $citasDia = $citasPorFecha[$fechaStr] ?? [];

        // 3. Generar slots de horarios disponibles para este día
        $slots = [];
        foreach ($horariosDia as $turno) {
          $slotsTurno = $this->generarSlotsDisponibles(
            $fechaStr,
            $turno->getHoraInicio(),
            $turno->getHoraFin(),
            $duracionMinutos,
            $bloqueosDia,
            $citasDia
          );
          $slots = array_merge($slots, $slotsTurno);
        }

        // Si tiene al menos 1 horario libre, lo agregamos como día disponible garantizado
        if (count($slots) > 0) {
          $tienePendientes = $this->hayPendientes($citasDia);

          $diasEncontrados[] = $this->construirDatosDia(
            $fechaStr,
            $diaSemana,
            'disponible',
            null,
            count($slots),
            $tienePendientes,
            $conSlots,
            $slots
          );

          if (count($diasEncontrados) >= $cantidadDias) {
            break 2; // Salir de ambos bucles al completar la cuota de días
          }
        }
      }

      // Avanzar el cursor al día posterior del bloque actual
      $cursor = (clone $finBloque)->modify('+1 day');
    }

    return $diasEncontrados;
  }

  /**
   * Obtiene la lista de horarios específicos disponibles para un día dado y servicio.
   *
   * @param string $fecha Formato YYYY-MM-DD.
   * @param int $servicioId ID del servicio solicitado.
   * @return array<int, array<string, string>> Lista de slots con formato estándar y amigable.
   */
  public function obtenerHorasDisponibles(string $fecha, int $servicioId): array
  {
    $servicio = $this->servicioRepo->buscarPorId($servicioId);
    if (!$servicio || !$servicio->isActivo()) {
      return [];
    }

    $fechaObj = new DateTime($fecha);
    $diaSemana = (int) $fechaObj->format('w');

    // 1. Validar bloqueos generales (vacaciones, días festivos aplican a todos los servicios)
    $bloqueos = $this->horarioRepo->obtenerBloqueosEnRango($fecha, $fecha);
    if ($this->buscarBloqueoCompleto($bloqueos) !== null) {
      return [];
    }

    // 2. Herencia con Sobrescritura: ¿Tiene horario personalizado?
    if ($servicio->tieneHorarioPersonalizado()) {
      $rangos = $servicio->obtenerRangosPorDia($diaSemana);
      if (empty($rangos)) {
        return [];
      }
      $horariosDia = array_map(function (array $r) use ($diaSemana): HorarioAtencion {
        $inicio = strlen($r['hora_inicio']) === 5 ? $r['hora_inicio'] . ':00' : $r['hora_inicio'];
        $fin = strlen($r['hora_fin']) === 5 ? $r['hora_fin'] . ':00' : $r['hora_fin'];
        return new HorarioAtencion(
          id: null,
          diaSemana: $diaSemana,
          horaInicio: $inicio,
          horaFin: $fin,
          activo: true
        );
      }, $rangos);
    } else {
      $horariosDia = $this->horarioRepo->obtenerPorDiaSemana($diaSemana);
      if (empty($horariosDia)) {
        return [];
      }
    }

    $citas = $this->citaRepo->obtenerPorRangoFechas($fecha, $fecha, [
      EstadoCita::PENDIENTE->value,
      EstadoCita::CONFIRMADA->value
    ]);

    $todosSlots = [];
    foreach ($horariosDia as $turno) {
      $slotsTurno = $this->generarSlotsDisponibles(
        $fecha,
        $turno->getHoraInicio(),
        $turno->getHoraFin(),
        $servicio->getDuracionMinutos(),
        $bloqueos,
        $citas
      );
      $todosSlots = array_merge($todosSlots, $slotsTurno);
    }
    return $todosSlots;
  }

  /**
   * Resuelve los turnos de atención para un día de la semana y servicio dado,
   * aplicando la regla de herencia con sobrescritura (horario personalizado vs general).
   *
   * @param int $diaSemana Día de la semana (0 a 6).
   * @param Servicio|null $servicio Entidad de servicio (si aplica).
   * @param array<int, array<int, HorarioAtencion>> $horariosSemanales Horarios generales indexados por día.
   * @return HorarioAtencion[] Lista de turnos para el día o arreglo vacío si está cerrado.
   */
  private function resolverTurnosDia(
    int $diaSemana,
    ?Servicio $servicio,
    array $horariosSemanales
  ): array {
    if ($servicio !== null && $servicio->tieneHorarioPersonalizado()) {
      $rangos = $servicio->obtenerRangosPorDia($diaSemana);
      if (empty($rangos)) {
        return [];
      }
      return array_map(function (array $r) use ($diaSemana): HorarioAtencion {
        $inicio = strlen($r['hora_inicio']) === 5 ? $r['hora_inicio'] . ':00' : $r['hora_inicio'];
        $fin = strlen($r['hora_fin']) === 5 ? $r['hora_fin'] . ':00' : $r['hora_fin'];
        return new HorarioAtencion(
          id: null,
          diaSemana: $diaSemana,
          horaInicio: $inicio,
          horaFin: $fin,
          activo: true
        );
      }, $rangos);
    }

    return $horariosSemanales[$diaSemana] ?? [];
  }

  /**
   * Carga y organiza por fecha/día los horarios semanales, bloqueos y citas activas en un rango.
   *
   * @param string $fechaInicioStr Fecha inicial en formato YYYY-MM-DD.
   * @param string $fechaFinStr Fecha final en formato YYYY-MM-DD.
   * @return array{
   *   horarios_semanales: array<int, array<int, HorarioAtencion>>,
   *   bloqueos_por_fecha: array<string, array<int, BloqueoAgenda>>,
   *   citas_por_fecha: array<string, array<int, \App\Agenda\Entities\Cita>>
   * }
   */
  private function cargarDatosRango(string $fechaInicioStr, string $fechaFinStr): array
  {
    $horariosSemanales = [];
    foreach ($this->horarioRepo->obtenerHorariosSemanales() as $h) {
      $horariosSemanales[$h->getDiaSemana()][] = $h;
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

    return [
      'horarios_semanales' => $horariosSemanales,
      'bloqueos_por_fecha' => $bloqueosPorFecha,
      'citas_por_fecha' => $citasPorFecha
    ];
  }

  /**
   * Busca si existe un bloqueo de día completo dentro de la lista de bloqueos del día.
   *
   * @param array<int, BloqueoAgenda> $bloqueosDia Lista de bloqueos correspondientes al día.
   * @return BloqueoAgenda|null Bloqueo encontrado o null si no existe bloqueo total.
   */
  private function buscarBloqueoCompleto(array $bloqueosDia): ?BloqueoAgenda
  {
    foreach ($bloqueosDia as $b) {
      if ($b->esDiaCompleto()) {
        return $b;
      }
    }
    return null;
  }

  /**
   * Verifica si alguna de las citas del día se encuentra en estado pendiente.
   *
   * @param array<int, \App\Agenda\Entities\Cita> $citasDia Lista de citas del día.
   * @return bool True si al menos una cita está pendiente de confirmación.
   */
  private function hayPendientes(array $citasDia): bool
  {
    foreach ($citasDia as $c) {
      if ($c->estaPendiente()) {
        return true;
      }
    }
    return false;
  }

  /**
   * Resuelve la duración en minutos según el servicio proporcionado, con valor predeterminado de 60 minutos.
   *
   * @param int|null $servicioId ID opcional del servicio.
   * @return int Duración en minutos calculada.
   */
  private function resolverDuracionServicio(?int $servicioId): int
  {
    if ($servicioId !== null) {
      $servicio = $this->servicioRepo->buscarPorId($servicioId);
      if ($servicio) {
        return $servicio->getDuracionMinutos();
      }
    }
    return 60;
  }

  /**
   * Ensambla el array estándar representativo de la información de disponibilidad de un día.
   *
   * @param string $fecha Fecha en formato YYYY-MM-DD.
   * @param int $diaSemana Día de la semana (0=Domingo, 1=Lunes, etc.).
   * @param string $estado Estado del día ('disponible', 'ocupado', 'bloqueado', 'cerrado').
   * @param string|null $motivo Motivo descriptivo del estado cuando aplica.
   * @param int $slotsLibres Cantidad de slots libres disponibles.
   * @param bool $tienePendientes Si existen citas pendientes asociadas al día.
   * @param bool $conSlots Si se deben incrustar los slots horarios en la respuesta.
   * @param array<int, array<string, string>> $slots Lista de slots calculados.
   * @return array<string, mixed>
   */
  private function construirDatosDia(
    string $fecha,
    int $diaSemana,
    string $estado,
    ?string $motivo,
    int $slotsLibres,
    bool $tienePendientes,
    bool $conSlots = false,
    array $slots = []
  ): array {
    $diaData = [
      'fecha' => $fecha,
      'dia_semana' => $diaSemana,
      'estado' => $estado,
      'motivo' => $motivo,
      'slots_libres' => $slotsLibres,
      'tiene_pendientes' => $tienePendientes
    ];

    if ($conSlots) {
      $diaData['slots'] = $slots;
    }

    return $diaData;
  }

  /**
   * Determina el estado, motivo y nivel de ocupación para un día laboral regular en vista administrativa.
   *
   * @param int $capacidad Capacidad total teórica de slots del día.
   * @param int $slotsLibres Cantidad de slots libres remanentes.
   * @param int $totalCitas Total de citas activas agendadas en el día.
   * @param array<int, BloqueoAgenda> $bloqueosDia Lista de bloqueos del día.
   * @return array{estado: string, motivo: string|null, nivel_ocupacion: string}
   */
  private function determinarOcupacionDiaAdmin(
    int $capacidad,
    int $slotsLibres,
    int $totalCitas,
    array $bloqueosDia
  ): array {
    if (!empty($bloqueosDia) && $slotsLibres === 0 && $totalCitas === 0) {
      $primerBloqueo = reset($bloqueosDia);
      return [
        'estado' => 'bloqueado',
        'motivo' => $primerBloqueo ? ($primerBloqueo->getMotivo() ?: 'Bloqueado') : 'Bloqueado',
        'nivel_ocupacion' => 'bloqueado'
      ];
    }

    if ($slotsLibres === 0 || $totalCitas >= $capacidad) {
      return [
        'estado' => 'ocupado',
        'motivo' => 'Sin horarios disponibles',
        'nivel_ocupacion' => 'todo agendado'
      ];
    }

    if ($totalCitas === 0) {
      return [
        'estado' => 'disponible',
        'motivo' => null,
        'nivel_ocupacion' => 'nada agendado'
      ];
    }

    return [
      'estado' => 'disponible',
      'motivo' => null,
      'nivel_ocupacion' => 'parcial'
    ];
  }

  /**
   * Calcula la capacidad total teórica de un turno sin considerar bloqueos ni citas.
   *
   * @param string $horaInicio Hora de inicio laboral (HH:MM:SS o HH:MM).
   * @param string $horaFin Hora de fin laboral (HH:MM:SS o HH:MM).
   * @param int $duracionMinutos Duración base en minutos de cada slot.
   * @return int Capacidad máxima de slots en el turno.
   */
  private function calcularCapacidadTurno(string $horaInicio, string $horaFin, int $duracionMinutos): int
  {
    $inicio = new DateTime("1970-01-01 {$horaInicio}");
    $fin = new DateTime("1970-01-01 {$horaFin}");
    $minutosTotales = ($fin->getTimestamp() - $inicio->getTimestamp()) / 60;
    if ($minutosTotales <= 0 || $duracionMinutos <= 0) {
      return 0;
    }
    return (int) floor($minutosTotales / $duracionMinutos);
  }

  /**
   * Divide el horario laboral en intervalos y descuenta citas y bloqueos existentes.
   * Enriquece cada slot con formatos legibles en 12 horas (AM/PM) para vistas móviles.
   *
   * @param string $fecha Formato YYYY-MM-DD.
   * @param string $horaApertura Hora de inicio laboral (HH:MM:SS).
   * @param string $horaCierre Hora de cierre laboral (HH:MM:SS).
   * @param int $duracionMinutos Duración del servicio.
   * @param array<int, BloqueoAgenda> $bloqueos Bloqueos del día.
   * @param array<int, \App\Agenda\Entities\Cita> $citas Citas del día.
   * @param bool $incluirPasados Si es true, no descarta horas pasadas ni genera formato AM/PM (modo admin).
   * @return array<int, array<string, string>>
   */
  private function generarSlotsDisponibles(
    string $fecha,
    string $horaApertura,
    string $horaCierre,
    int $duracionMinutos,
    array $bloqueos,
    array $citas,
    bool $incluirPasados = false
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

      // Si la fecha es hoy y la hora ya pasó, se descarta (solo para clientes públicos)
      if (!$incluirPasados && $actual <= $ahora) {
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
        $horaInicioCorta = $actual->format('H:i');
        $horaFinCorta = $finSlot->format('H:i');

        if ($incluirPasados) {
          $slots[] = [
            'hora_inicio' => $horaInicioCorta,
            'hora_fin' => $horaFinCorta,
            'hora_inicio_completa' => $horaInicioStr,
            'hora_fin_completa' => $horaFinStr
          ];
        } else {
          $inicioAmPm = self::formatearHoraAmPm($horaInicioCorta);
          $finAmPm = self::formatearHoraAmPm($horaFinCorta);

          $slots[] = [
            'hora_inicio' => $horaInicioCorta,
            'hora_fin' => $horaFinCorta,
            'hora_inicio_completa' => $horaInicioStr,
            'hora_fin_completa' => $horaFinStr,
            'hora_inicio_formato' => $inicioAmPm,
            'hora_fin_formato' => $finAmPm,
            'etiqueta' => "{$inicioAmPm} - {$finAmPm}"
          ];
        }
      }

      $actual->modify("+{$duracionMinutos} minutes");
    }

    return $slots;
  }

  /**
   * Calcula los slots totales y libres de un día sin descartar horas pasadas,
   * delegando en generarSlotsDisponibles con inclusión de pasados para optimizar el panel administrativo.
   *
   * @param string $fecha Formato YYYY-MM-DD
   * @param array<int, HorarioAtencion> $horariosDia Lista de HorarioAtencion para el día
   * @param array<int, BloqueoAgenda> $bloqueosDia Lista de BloqueoAgenda para el día
   * @param array<int, \App\Agenda\Entities\Cita> $citasDia Lista de Cita para el día
   * @param int $duracionMinutos Duración base para los slots
   * @return array{capacidad: int, slots_libres: int}
   */
  private function calcularSlotsDiaAdmin(
    string $fecha,
    array $horariosDia,
    array $bloqueosDia,
    array $citasDia,
    int $duracionMinutos = 60
  ): array {
    $capacidad = 0;
    $slotsLibres = 0;

    foreach ($horariosDia as $turno) {
      $capacidad += $this->calcularCapacidadTurno($turno->getHoraInicio(), $turno->getHoraFin(), $duracionMinutos);
      $slots = $this->generarSlotsDisponibles(
        $fecha,
        $turno->getHoraInicio(),
        $turno->getHoraFin(),
        $duracionMinutos,
        $bloqueosDia,
        $citasDia,
        true
      );
      $slotsLibres += count($slots);
    }

    return [
      'capacidad' => $capacidad,
      'slots_libres' => $slotsLibres
    ];
  }

  /**
   * Convierte una hora en formato HH:MM o HH:MM:SS a formato legible de 12 horas (ej. "9am", "9:30am", "5pm").
   *
   * @param string $hora
   * @return string
   */
  public static function formatearHoraAmPm(string $hora): string
  {
    $horaTrim = trim($hora);
    if ($horaTrim === '') {
      return '';
    }

    $dt = DateTime::createFromFormat('H:i:s', $horaTrim) ?: DateTime::createFromFormat('H:i', $horaTrim);
    if (!$dt) {
      return $hora;
    }

    $h = (int) $dt->format('g');
    $m = (int) $dt->format('i');
    $ampm = strtolower($dt->format('a'));

    return $m === 0 ? "{$h}{$ampm}" : "{$h}:" . $dt->format('i') . $ampm;
  }

  /**
   * Comprueba si dos rangos de horas se traslapan.
   *
   * @param string $inicioA
   * @param string $finA
   * @param string $inicioB
   * @param string $finB
   * @return bool
   */
  private function hayTraslape(string $inicioA, string $finA, string $inicioB, string $finB): bool
  {
    return ($inicioA < $finB) && ($finA > $inicioB);
  }
}
