<?php

namespace App\Agenda\Services;

use App\Agenda\Entities\Cita;
use App\Agenda\Entities\Cliente;
use App\Agenda\Entities\EstadoCita;
use App\Agenda\Entities\Servicio;
use App\Agenda\Repositories\CitaRepository;
use App\Agenda\Repositories\ClienteRepository;
use App\Agenda\Repositories\HorarioRepository;
use App\Agenda\Repositories\ServicioRepository;
use App\Shared\Db\DataBase;
use DateTime;
use Exception;
use Throwable;

/**
 * AgendaService - Servicio de dominio y aplicación para la gestión de la Agenda de Citas.
 *
 * Coordina los casos de uso principales:
 * - Consulta de clientes por Blind Index telefónico.
 * - Registro atómico de citas (ACID) con validación de disponibilidad y prevención de colisiones.
 * - Disparo de notificaciones Web Push al administrador en tiempo real.
 * - Confirmación de citas con validación de estado y generación condicional de WhatsApp.
 * - Reprogramación y cancelación de citas respetando horarios semanales, bloqueos y canales de contacto.
 *
 * @package App\Agenda\Services
 */
class AgendaService
{
  /**
   * Repositorio de citas y reservas.
   */
  private CitaRepository $citaRepo;

  /**
   * Repositorio de clientes y pacientes.
   */
  private ClienteRepository $clienteRepo;

  /**
   * Repositorio de catálogo de servicios.
   */
  private ServicioRepository $servicioRepo;

  /**
   * Repositorio de horarios semanales y bloqueos de agenda.
   */
  private HorarioRepository $horarioRepo;

  /**
   * Servicio de cálculo de disponibilidad de fechas y slots.
   */
  private DisponibilidadService $disponibilidadService;

  /**
   * Servicio de notificaciones.
   */
  private ?NotificationService $notificationService;

  /**
   * Servicio de WhatsApp.
   */
  private WhatsAppService $whatsAppService;

  /**
   * Conexión a la base de datos para transacciones atómicas.
   */
  private DataBase $db;

  /**
   * Número de WhatsApp oficial del Administrador (sin signos ni espacios).
   */
  private string $adminWhatsapp;

  /**
   * Constructor del servicio con inyección de dependencias y defaults desacoplados.
   *
   * @param CitaRepository|null $citaRepo
   * @param ClienteRepository|null $clienteRepo
   * @param ServicioRepository|null $servicioRepo
   * @param HorarioRepository|null $horarioRepo
   * @param DisponibilidadService|null $disponibilidadService
   * @param NotificationService|null $notificationService
   * @param WhatsAppService|null $whatsAppService
   * @param DataBase|null $db
   * @param string|null $adminWhatsapp
   */
  public function __construct(
    ?CitaRepository $citaRepo = null,
    ?ClienteRepository $clienteRepo = null,
    ?ServicioRepository $servicioRepo = null,
    ?HorarioRepository $horarioRepo = null,
    ?DisponibilidadService $disponibilidadService = null,
    ?NotificationService $notificationService = null,
    ?WhatsAppService $whatsAppService = null,
    ?DataBase $db = null,
    ?string $adminWhatsapp = null
  ) {
    $this->citaRepo = $citaRepo ?? new CitaRepository();
    $this->clienteRepo = $clienteRepo ?? new ClienteRepository();
    $this->servicioRepo = $servicioRepo ?? new ServicioRepository();
    $this->horarioRepo = $horarioRepo ?? new HorarioRepository();
    $this->disponibilidadService = $disponibilidadService ?? new DisponibilidadService();
    $this->notificationService = $notificationService;
    $this->whatsAppService = $whatsAppService ?? new WhatsAppService();
    $this->db = $db ?? DataBase::getInstance();

    if ($adminWhatsapp !== null) {
      $this->adminWhatsapp = $adminWhatsapp;
    } elseif (defined('ADMIN_WHATSAPP')) {
      $this->adminWhatsapp = (string) ADMIN_WHATSAPP;
    } else {
      $this->adminWhatsapp = '523121064455';
    }
  }

  /**
   * Busca si un cliente ya existe mediante su número de teléfono (Blind Index) para precargar sus datos.
   *
   * @param string $telefono Número telefónico sin normalizar.
   * @return array{id: int, nombre_completo: string, telefono: string|null}|null
   */
  public function consultarClientePorTelefono(string $telefono): ?array
  {
    $cliente = $this->clienteRepo->buscarPorTelefono($telefono);
    if (!$cliente) {
      return null;
    }

    return [
      'id' => $cliente->getId(),
      'nombre_completo' => $cliente->getNombreCompleto(),
      'telefono' => $this->clienteRepo->descifrarTelefono($cliente)
    ];
  }

  /**
   * Obtiene el catálogo completo de servicios activos en formato array para la API (CQRS Read Model).
   *
   * @return array<int, array<string, mixed>>
   */
  public function obtenerCatalogoServicios(): array
  {
    return $this->servicioRepo->obtenerCatalogoArray();
  }

  /**
   * Obtiene todas las solicitudes pendientes de confirmación para el panel administrativo,
   * con los números telefónicos de los pacientes descifrados a texto plano seguro.
   *
   * @return array<int, array<string, mixed>>
   */
  public function obtenerSolicitudesPendientesAdmin(): array
  {
    return $this->citaRepo->obtenerSolicitudesPendientes();
  }

  /**
   * Obtiene citas con detalles de cliente en un rango de fechas, útil para el calendario admin.
   *
   * @param string $fechaInicio
   * @param string $fechaFin
   * @param string|null $estado Filtro opcional
   * @return array
   */
  public function obtenerCitasAdminPorRango(string $fechaInicio, string $fechaFin, ?string $estado = null): array
  {
    return $this->citaRepo->obtenerDetallesPorRangoFechas($fechaInicio, $fechaFin, $estado);
  }

  /**
   * Caso de Uso: Agendar una nueva cita (Estado inicial: Pendiente).
   *
   * Ejecuta dentro de una transacción ACID:
   * 1. Validación de conflicto de horario en base de datos.
   * 2. Búsqueda o registro del cliente (soporta celular opcional para admin).
   * 3. Creación y persistencia de la entidad Cita con atributos tiene_whatsapp y canal.
   *
   * Tras confirmar la transacción:
   * 4. Genera mensaje y enlace de WhatsApp condicional (solo si tiene WhatsApp activo).
   * 5. Dispara notificación Web Push automática al panel PWA del administrador.
   *
   * @param string $nombreCompleto Nombre del paciente.
   * @param string|null $telefono Celular del paciente (opcional en agendado directo).
   * @param int $servicioId ID del servicio solicitado.
   * @param string $fechaCita Fecha en formato YYYY-MM-DD.
   * @param string $horaInicio Hora de inicio en formato HH:MM o HH:MM:SS.
   * @param string|null $notasCliente Motivos, síntomas o comentarios adicionales.
   * @param string $medioContacto Exclusivamente 'whatsapp'.
   * @param bool|null $tieneWhatsapp Indica si el paciente dispone de WhatsApp (true por defecto para web).
   * @param string $canal Canal de origen ('web').
   * @return array<string, mixed> Resumen de la reserva creada.
   * @throws Exception Si el servicio no es válido, el horario no está disponible o falla la persistencia.
   */
  public function agendarCita(
    string $nombreCompleto,
    ?string $telefono,
    int $servicioId,
    string $fechaCita,
    string $horaInicio,
    ?string $notasCliente = null,
    string $medioContacto = 'whatsapp',
    ?bool $tieneWhatsapp = null,
    string $canal = 'web'
  ): array {
    $servicio = $this->servicioRepo->buscarPorId($servicioId);
    if (!$servicio || !$servicio->isActivo()) {
      throw new Exception("El servicio seleccionado no es válido o no se encuentra activo.");
    }

    // Calcular hora de finalización en base a la duración del servicio
    $inicioObj = new DateTime("{$fechaCita} {$horaInicio}");
    $finObj = (clone $inicioObj)->modify("+{$servicio->getDuracionMinutos()} minutes");
    $horaFin = $finObj->format('H:i:s');
    $horaInicioNorm = $inicioObj->format('H:i:s');

    // Flujo web público: Exclusivo por WhatsApp
    $tieneWaFinal = $tieneWhatsapp ?? true;
    $notaFinal = $notasCliente;

    // Ejecución atómica garantizada con transacción SQL
    $resultado = $this->db->transaction(function () use (
      $nombreCompleto,
      $telefono,
      $servicio,
      $fechaCita,
      $horaInicioNorm,
      $horaFin,
      $inicioObj,
      $notaFinal,
      $tieneWaFinal,
      $canal
    ) {
      // 1. Validar ausencia de colisiones de horario dentro de la transacción
      if ($this->citaRepo->existeConflictoHorario($fechaCita, $horaInicioNorm, $horaFin)) {
        throw new Exception("Lo sentimos, el horario {$inicioObj->format('H:i')} para el día {$fechaCita} ya no se encuentra disponible.");
      }

      // 2. Buscar o registrar al cliente
      $cliente = null;
      if (!empty($telefono)) {
        $cliente = $this->clienteRepo->buscarPorTelefono($telefono);
      }

      if (!$cliente) {
        $cliente = $this->clienteRepo->registrar($nombreCompleto, $telefono);
      } else {
        // Actualizar nombre si el cliente recurrente lo modificó
        if (trim($nombreCompleto) !== '' && $nombreCompleto !== $cliente->getNombreCompleto()) {
          $this->clienteRepo->actualizar($cliente->getId(), $nombreCompleto);
          $cliente->setNombreCompleto($nombreCompleto);
        }
      }

      // 3. Crear entidad de Cita
      $codigoCita = CitaRepository::generarCodigo();
      $cita = new Cita(
        codigoCita: $codigoCita,
        clienteId: (int) $cliente->getId(),
        servicioId: (int) $servicio->getId(),
        fechaCita: $fechaCita,
        horaInicio: $horaInicioNorm,
        horaFin: $horaFin,
        estado: EstadoCita::PENDIENTE,
        tieneWhatsapp: $tieneWaFinal,
        canal: $canal,
        notasCliente: $notaFinal
      );

      $citaId = $this->citaRepo->crear($cita);
      $cita->setId($citaId);

      return [
        'cita' => $cita,
        'cliente' => $cliente,
        'codigo_cita' => $codigoCita,
        'cita_id' => $citaId
      ];
    });

    /** @var Cita $citaCreada */
    $citaCreada = $resultado['cita'];
    /** @var Cliente $clienteCreado */
    $clienteCreado = $resultado['cliente'];

    // 4. Generar mensaje y enlace de WhatsApp condicional para el Administrador
    $mensajeWhatsapp = null;
    $whatsappUrl = null;

    if ($tieneWaFinal && !empty($this->adminWhatsapp)) {
      $mensajeWhatsapp = $this->whatsAppService->generarMensajeSolicitudAdmin(
        nombre: $nombreCompleto,
        telefono: $telefono ?? '',
        servicioNombre: $servicio->getNombre(),
        fecha: $fechaCita,
        horaInicio: $inicioObj->format('H:i'),
        horaFin: $finObj->format('H:i'),
        codigoCita: $resultado['codigo_cita'],
        notas: $notasCliente
      );

      $whatsappUrl = $this->whatsAppService->crearEnlaceWhatsapp($this->adminWhatsapp, $mensajeWhatsapp);
    }

    // 5. Notificar al Administrador mediante Web Push en su PWA (no bloqueante)
    if ($this->notificationService) {
      $this->notificationService->notificarAdminNuevaCita($citaCreada, $clienteCreado, $servicio);
    }

    return [
      'exito' => true,
      'cita_id' => $resultado['cita_id'],
      'codigo_cita' => $resultado['codigo_cita'],
      'estado' => $citaCreada->getEstado()->value,
      'tiene_whatsapp' => $citaCreada->tieneWhatsapp(),
      'canal' => $citaCreada->getCanal(),
      'medio_contacto' => $medioContacto,
      'telefono_admin' => $this->adminWhatsapp,
      'cliente' => [
        'id' => $clienteCreado->getId(),
        'nombre' => $clienteCreado->getNombreCompleto(),
        'telefono' => $telefono
      ],
      'servicio' => [
        'id' => $servicio->getId(),
        'nombre' => $servicio->getNombre(),
        'duracion_minutos' => $servicio->getDuracionMinutos()
      ],
      'fecha_cita' => $fechaCita,
      'hora_inicio' => $inicioObj->format('H:i'),
      'hora_inicio_formato' => DisponibilidadService::formatearHoraAmPm($inicioObj->format('H:i')),
      'hora_fin' => $finObj->format('H:i'),
      'mensaje_whatsapp' => $mensajeWhatsapp,
      'whatsapp_url' => $whatsappUrl
    ];
  }

  /**
   * Caso de Uso Administrativo: Agendar una cita directamente desde el panel del terapeuta.
   *
   * Permite:
   * - Pacientes sin celular (presenciales o por recomendación).
   * - Confirmación inmediata opcional (estado 'confirmada') o dejarla 'pendiente'.
   * - Canal 'admin' o personalizado ('llamada', etc.).
   * - Registro de notas administrativas internas.
   *
   * @param string $nombreCompleto
   * @param string|null $telefono
   * @param int $servicioId
   * @param string $fechaCita YYYY-MM-DD
   * @param string $horaInicio HH:MM o HH:MM:SS
   * @param string|null $notasAdmin
   * @param string|null $notasCliente
   * @param bool $confirmarInmediatamente
   * @param bool|null $tieneWhatsapp
   * @param string $canal
   * @return array<string, mixed>
   * @throws Exception
   */
  public function agendarCitaAdmin(
    string $nombreCompleto,
    ?string $telefono,
    int $servicioId,
    string $fechaCita,
    string $horaInicio,
    ?string $notasAdmin = null,
    ?string $notasCliente = null,
    bool $confirmarInmediatamente = false,
    ?bool $tieneWhatsapp = null,
    string $canal = 'admin'
  ): array {
    $servicio = $this->servicioRepo->buscarPorId($servicioId);
    if (!$servicio || !$servicio->isActivo()) {
      throw new Exception("El servicio seleccionado no es válido o no se encuentra activo.");
    }

    $inicioObj = new DateTime("{$fechaCita} {$horaInicio}");
    $finObj = (clone $inicioObj)->modify("+{$servicio->getDuracionMinutos()} minutes");
    $horaInicioNorm = $inicioObj->format('H:i:s');
    $horaFinNorm = $finObj->format('H:i:s');

    // Validar día laboral y bloqueos
    $diaSemana = (int) $inicioObj->format('w');
    $horarioDia = $this->horarioRepo->obtenerPorDiaSemana($diaSemana);
    if (!$horarioDia || !$horarioDia->isActivo()) {
      throw new Exception("El centro no labora en el día de la semana seleccionado ({$fechaCita}).");
    }

    $bloqueos = $this->horarioRepo->obtenerBloqueosEnRango($fechaCita, $fechaCita);
    foreach ($bloqueos as $bloqueo) {
      if ($bloqueo->esDiaCompleto()) {
        $motivoB = $bloqueo->getMotivo() ? " ({$bloqueo->getMotivo()})" : "";
        throw new Exception("El día {$fechaCita} no se encuentra disponible por suspensión de labores{$motivoB}.");
      }
    }

    $telefonoNormalizado = !empty(trim((string) $telefono))
      ? Encryption::normalizePhone($telefono)
      : null;

    $tieneWaEfectivo = $tieneWhatsapp ?? ($telefonoNormalizado !== null && $canal !== 'llamada');
    $estadoInicial = $confirmarInmediatamente ? EstadoCita::CONFIRMADA : EstadoCita::PENDIENTE;

    $resultado = $this->db->transaction(function () use (
      $nombreCompleto,
      $telefonoNormalizado,
      $servicio,
      $fechaCita,
      $horaInicioNorm,
      $horaFinNorm,
      $estadoInicial,
      $tieneWaEfectivo,
      $canal,
      $notasCliente,
      $notasAdmin
    ) {
      if ($this->citaRepo->existeConflictoHorario($fechaCita, $horaInicioNorm, $horaFinNorm)) {
        throw new Exception("Lo sentimos, el horario para el día {$fechaCita} ya se encuentra ocupado por otra cita.");
      }

      $cliente = null;
      if ($telefonoNormalizado !== null) {
        $cliente = $this->clienteRepo->buscarPorTelefono($telefonoNormalizado);
      }

      if (!$cliente) {
        $cliente = $this->clienteRepo->registrar($nombreCompleto, $telefonoNormalizado);
      }

      $codigoCita = CitaRepository::generarCodigo();
      $cita = new Cita(
        id: 0,
        codigoCita: $codigoCita,
        clienteId: $cliente->getId(),
        servicioId: $servicio->getId(),
        fechaCita: $fechaCita,
        horaInicio: $horaInicioNorm,
        horaFin: $horaFinNorm,
        estado: $estadoInicial,
        tieneWhatsapp: $tieneWaEfectivo,
        canal: $canal,
        notasCliente: $notasCliente,
        notasAdmin: $notasAdmin
      );

      $citaId = $this->citaRepo->crear($cita);
      $cita->setId($citaId);

      return [
        'cita' => $cita,
        'cliente' => $cliente,
        'codigo_cita' => $codigoCita,
        'cita_id' => $citaId
      ];
    });

    /** @var Cita $citaCreada */
    $citaCreada = $resultado['cita'];
    /** @var Cliente $clienteCreado */
    $clienteCreado = $resultado['cliente'];

    $whatsappUrl = null;
    $mensajeWhatsapp = null;
    if ($tieneWaEfectivo && $telefonoNormalizado !== null) {
      $mensajeWhatsapp = $this->whatsAppService->generarMensajeConfirmacionCliente(
        nombre: $clienteCreado->getNombreCompleto(),
        servicioNombre: $servicio->getNombre(),
        fecha: $fechaCita,
        horaInicio: substr($horaInicioNorm, 0, 5),
        codigoCita: $resultado['codigo_cita'],
        mensajeExtra: $notasAdmin
      );
      $whatsappUrl = $this->whatsAppService->crearEnlaceWhatsapp($telefonoNormalizado, $mensajeWhatsapp);
    }

    return [
      'exito' => true,
      'cita_id' => $resultado['cita_id'],
      'codigo_cita' => $resultado['codigo_cita'],
      'estado' => $citaCreada->getEstado()->value,
      'tiene_whatsapp' => $citaCreada->tieneWhatsapp(),
      'canal' => $citaCreada->getCanal(),
      'cliente' => [
        'id' => $clienteCreado->getId(),
        'nombre' => $clienteCreado->getNombreCompleto(),
        'telefono' => $telefonoNormalizado
      ],
      'servicio' => [
        'id' => $servicio->getId(),
        'nombre' => $servicio->getNombre(),
        'duracion_minutos' => $servicio->getDuracionMinutos(),
        'precio' => $servicio->getPrecio()
      ],
      'fecha_cita' => $fechaCita,
      'hora_inicio' => substr($horaInicioNorm, 0, 5),
      'hora_fin' => substr($horaFinNorm, 0, 5),
      'mensaje_whatsapp' => $mensajeWhatsapp,
      'whatsapp_url' => $whatsappUrl
    ];
  }

  /**
   * Caso de Uso: Administrador confirma la cita.
   *
   * Valida:
   * - Existencia de la cita, del cliente y del servicio.
   * - Que la cita se encuentre estrictamente en estado PENDIENTE.
   * - Que no exista otra cita confirmada en el mismo horario.
   *
   * Cumplimiento de regla de negocio:
   * - Solo genera enlace de WhatsApp si la cita tiene activa la interacción por WhatsApp y el cliente registró teléfono.
   *
   * @param int $citaId
   * @param string|null $mensajeAdmin
   * @return array<string, mixed>
   * @throws Exception
   */
  public function confirmarCita(int $citaId, ?string $mensajeAdmin = null): array
  {
    $cita = $this->citaRepo->buscarPorId($citaId);
    if (!$cita) {
      throw new Exception("La cita solicitada no existe.");
    }

    if (!$cita->estaPendiente()) {
      throw new Exception("Solo se pueden confirmar citas en espera de confirmación (estado actual: {$cita->getEstado()->label()}).");
    }

    $cliente = $this->clienteRepo->buscarPorId($cita->getClienteId());
    if (!$cliente) {
      throw new Exception("El cliente asociado a la cita no fue encontrado.");
    }

    $servicio = $this->servicioRepo->buscarPorId($cita->getServicioId());
    if (!$servicio) {
      throw new Exception("El servicio asociado a la cita no fue encontrado.");
    }

    // Validar que no haya colisión con otra cita ya confirmada en el mismo espacio
    if ($this->citaRepo->existeConflictoHorario($cita->getFechaCita(), $cita->getHoraInicio(), $cita->getHoraFin(), $citaId)) {
      throw new Exception("No se puede confirmar la cita: ya existe otro compromiso agendado en ese horario.");
    }

    $this->citaRepo->cambiarEstado($citaId, EstadoCita::CONFIRMADA, $mensajeAdmin);
    $cita->confirmar($mensajeAdmin);

    $telefonoCliente = $this->clienteRepo->descifrarTelefono($cliente);

    // Solo generar mensaje y URL de WhatsApp si la cita tiene WhatsApp y el cliente tiene teléfono registrado
    $mensajeConfirmacion = null;
    $whatsappUrl = null;

    if ($cita->tieneWhatsapp() && !empty($telefonoCliente)) {
      $mensajeConfirmacion = $this->whatsAppService->generarMensajeConfirmacionCliente(
        nombre: $cliente->getNombreCompleto(),
        servicioNombre: $servicio->getNombre(),
        fecha: $cita->getFechaCita(),
        horaInicio: substr($cita->getHoraInicio(), 0, 5),
        codigoCita: $cita->getCodigoCita(),
        mensajeExtra: $mensajeAdmin
      );

      $whatsappUrl = $this->whatsAppService->crearEnlaceWhatsapp($telefonoCliente, $mensajeConfirmacion);
    }

    return [
      'exito' => true,
      'cita_id' => $citaId,
      'codigo_cita' => $cita->getCodigoCita(),
      'estado' => EstadoCita::CONFIRMADA->value,
      'tiene_whatsapp' => $cita->tieneWhatsapp(),
      'cliente_nombre' => $cliente->getNombreCompleto(),
      'cliente_telefono' => $telefonoCliente,
      'mensaje_whatsapp' => $mensajeConfirmacion,
      'whatsapp_url' => $whatsappUrl
    ];
  }

  /**
   * Caso de Uso: Administrador cancela o rechaza una cita con motivo opcional.
   *
   * @param int $citaId
   * @param string|null $motivo
   * @return array<string, mixed>
   * @throws Exception
   */
  public function cancelarCita(int $citaId, ?string $motivo = null): array
  {
    $cita = $this->citaRepo->buscarPorId($citaId);
    if (!$cita) {
      throw new Exception("La cita no existe.");
    }

    $cliente = $this->clienteRepo->buscarPorId($cita->getClienteId());
    if (!$cliente) {
      throw new Exception("El cliente asociado no fue encontrado.");
    }

    $servicio = $this->servicioRepo->buscarPorId($cita->getServicioId());
    if (!$servicio) {
      throw new Exception("El servicio asociado no fue encontrado.");
    }

    $this->citaRepo->cambiarEstado($citaId, EstadoCita::CANCELADA, $motivo);
    $cita->cancelar($motivo);

    $telefonoCliente = $this->clienteRepo->descifrarTelefono($cliente);

    $mensajeCancelacion = null;
    $whatsappUrl = null;

    if ($cita->tieneWhatsapp() && !empty($telefonoCliente)) {
      $mensajeCancelacion = $this->whatsAppService->generarMensajeCancelacionCliente(
        nombre: $cliente->getNombreCompleto(),
        servicioNombre: $servicio->getNombre(),
        fecha: $cita->getFechaCita(),
        horaInicio: substr($cita->getHoraInicio(), 0, 5),
        codigoCita: $cita->getCodigoCita(),
        motivo: $motivo
      );

      $whatsappUrl = $this->whatsAppService->crearEnlaceWhatsapp($telefonoCliente, $mensajeCancelacion);
    }

    return [
      'exito' => true,
      'cita_id' => $citaId,
      'codigo_cita' => $cita->getCodigoCita(),
      'estado' => EstadoCita::CANCELADA->value,
      'tiene_whatsapp' => $cita->tieneWhatsapp(),
      'mensaje_whatsapp' => $mensajeCancelacion,
      'whatsapp_url' => $whatsappUrl
    ];
  }

  /**
   * Caso de Uso: Actualizar horario o fecha de una cita existente.
   *
   * Valida:
   * - Que la nueva fecha corresponda a un día de atención activo del centro.
   * - Que la nueva fecha y horas no choquen con bloqueos (festivos, descansos).
   * - Que no exista conflicto con otra cita activa en el nuevo horario.
   *
   * @param int $citaId
   * @param string $nuevaFecha Formato YYYY-MM-DD.
   * @param string $nuevaHoraInicio Formato HH:MM o HH:MM:SS.
   * @param int|null $nuevoServicioId ID de nuevo servicio o null para mantener el actual.
   * @param string|null $motivo Motivo de la reprogramación.
   * @return array<string, mixed>
   * @throws Exception
   */
  public function actualizarCita(
    int $citaId,
    string $nuevaFecha,
    string $nuevaHoraInicio,
    ?int $nuevoServicioId = null,
    ?string $motivo = null
  ): array {
    $cita = $this->citaRepo->buscarPorId($citaId);
    if (!$cita) {
      throw new Exception("La cita no existe.");
    }

    $cliente = $this->clienteRepo->buscarPorId($cita->getClienteId());
    if (!$cliente) {
      throw new Exception("El cliente asociado no fue encontrado.");
    }

    $servicioId = $nuevoServicioId ?? $cita->getServicioId();
    $servicio = $this->servicioRepo->buscarPorId($servicioId);
    if (!$servicio || !$servicio->isActivo()) {
      throw new Exception("El servicio seleccionado no es válido.");
    }

    // 1. Validar que el centro labore en ese día de la semana
    $fechaObj = new DateTime($nuevaFecha);
    $diaSemana = (int) $fechaObj->format('w');
    $horarioDia = $this->horarioRepo->obtenerPorDiaSemana($diaSemana);
    if (!$horarioDia || !$horarioDia->isActivo()) {
      throw new Exception("El centro no labora en el día de la semana seleccionado ({$nuevaFecha}).");
    }

    // 2. Validar que la nueva fecha no coincida con bloqueos festivos o de descanso
    $bloqueos = $this->horarioRepo->obtenerBloqueosEnRango($nuevaFecha, $nuevaFecha);
    foreach ($bloqueos as $bloqueo) {
      if ($bloqueo->esDiaCompleto()) {
        $motivoB = $bloqueo->getMotivo() ? " ({$bloqueo->getMotivo()})" : "";
        throw new Exception("El día {$nuevaFecha} no se encuentra disponible por suspensión de labores{$motivoB}.");
      }
    }

    // 3. Calcular horarios y verificar colisiones excluyendo la cita actual
    $inicioObj = new DateTime("{$nuevaFecha} {$nuevaHoraInicio}");
    $finObj = (clone $inicioObj)->modify("+{$servicio->getDuracionMinutos()} minutes");

    $horaInicioNorm = $inicioObj->format('H:i:s');
    $horaFinNorm = $finObj->format('H:i:s');

    if ($this->citaRepo->existeConflictoHorario($nuevaFecha, $horaInicioNorm, $horaFinNorm, $citaId)) {
      throw new Exception("El horario seleccionado para el día {$nuevaFecha} no está disponible.");
    }

    $cita->setFechaCita($nuevaFecha);
    $cita->setHoraInicio($horaInicioNorm);
    $cita->setHoraFin($horaFinNorm);
    $cita->setServicioId($servicioId);
    if ($motivo !== null) {
      $cita->setNotasAdmin($motivo);
    }

    $this->citaRepo->actualizar($cita);

    $telefonoCliente = $this->clienteRepo->descifrarTelefono($cliente);

    $mensajeActualizacion = null;
    $whatsappUrl = null;

    if ($cita->tieneWhatsapp() && !empty($telefonoCliente)) {
      $mensajeActualizacion = $this->whatsAppService->generarMensajeReprogramacionCliente(
        nombre: $cliente->getNombreCompleto(),
        fecha: $nuevaFecha,
        horaInicio: $inicioObj->format('H:i'),
        codigoCita: $cita->getCodigoCita(),
        motivo: $motivo
      );

      $whatsappUrl = $this->whatsAppService->crearEnlaceWhatsapp($telefonoCliente, $mensajeActualizacion);
    }

    return [
      'exito' => true,
      'cita_id' => $citaId,
      'codigo_cita' => $cita->getCodigoCita(),
      'fecha_cita' => $nuevaFecha,
      'hora_inicio' => $inicioObj->format('H:i'),
      'hora_inicio_formato' => DisponibilidadService::formatearHoraAmPm($inicioObj->format('H:i')),
      'tiene_whatsapp' => $cita->tieneWhatsapp(),
      'mensaje_whatsapp' => $mensajeActualizacion,
      'whatsapp_url' => $whatsappUrl
    ];
  }


}
