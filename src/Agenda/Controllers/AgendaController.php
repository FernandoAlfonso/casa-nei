<?php

namespace App\Agenda\Controllers;

use App\Agenda\Services\AgendaService;
use App\Agenda\Services\DisponibilidadService;
use App\Shared\Http\Request;
use App\Shared\Http\Response;
use Throwable;

/**
 * Class AgendaController
 *
 * Controlador HTTP delgado (Thin Controller) para el módulo de Agenda y Citas de Casa Nei.
 * Delega la lógica de negocio a los servicios de dominio correspondientes y orquesta
 * el flujo HTTP de entrada (Request) y salida (Response).
 *
 * Expone endpoints REST para:
 * - Catálogo de servicios activos.
 * - Calendario de disponibilidad en tiempo real.
 * - Horarios libres por día.
 * - Consulta de clientes (Blind Index).
 * - Agendado de citas con concurrencia y transacciones atómicas.
 * - Agendado administrativo directo (con teléfono opcional y canal admin).
 * - Panel administrativo (consulta, confirmación, cancelación y reprogramación).
 *
 * @package App\Agenda\Controllers
 */
class AgendaController
{
  /**
   * Servicio principal de gestión de agenda y casos de uso de reservas.
   */
  private AgendaService $agendaService;

  /**
   * Servicio de cálculo de disponibilidad de fechas y slots horarios.
   */
  private DisponibilidadService $disponibilidadService;

  /**
   * Constructor con soporte de inyección de dependencias PSR-11.
   *
   * @param AgendaService|null $agendaService
   * @param DisponibilidadService|null $disponibilidadService
   */
  public function __construct(
    ?AgendaService $agendaService = null,
    ?DisponibilidadService $disponibilidadService = null
  ) {
    $this->agendaService = $agendaService ?? new AgendaService();
    $this->disponibilidadService = $disponibilidadService ?? new DisponibilidadService();
  }

  /**
   * GET /api/servicios
   *
   * Retorna el catálogo de servicios activos con precios, duración en minutos e instrucciones.
   *
   * @param Request $request
   * @return void
   */
  public function obtenerServicios(Request $request): void
  {
    try {
      $data = $this->agendaService->obtenerCatalogoServicios();
      Response::success($data, "Servicios recuperados con éxito");
    } catch (Throwable $e) {
      Response::error("Error al obtener los servicios: " . $e->getMessage(), 500);
    }
  }

  /**
   * GET /api/calendario?fecha_desde=YYYY-MM-DD&servicio_id=1&cantidad_dias=12&solo_disponibles=1
   *
   * Retorna los días hábiles del calendario indicando su estado de ocupación, slots libres y bloqueos.
   *
   * @param Request $request
   * @return void
   */
  public function obtenerCalendario(Request $request): void
  {
    try {
      $fechaDesde = $request->getQuery('fecha_desde');
      $servicioId = $request->getQuery('servicio_id') ? (int) $request->getQuery('servicio_id') : null;

      // Determinar la cantidad de días solicitada (por defecto 12, equivalentes a 2 semanas completas de Lun a Sáb)
      if ($request->getQuery('cantidad_dias') !== null) {
        $cantidadDias = max(1, (int) $request->getQuery('cantidad_dias'));
      } elseif ($request->getQuery('semanas') !== null) {
        $cantidadDias = max(1, (int) $request->getQuery('semanas') * 6);
      } else {
        $cantidadDias = 12;
      }

      // Por defecto para el flujo público de usuario solo_disponibles es true
      $soloDisponiblesParam = $request->getQuery('solo_disponibles');
      $soloDisponibles = $soloDisponiblesParam === null || $soloDisponiblesParam === '1' || $soloDisponiblesParam === 'true';

      if ($soloDisponibles) {
        $calendario = $this->disponibilidadService->obtenerDiasDisponibles($fechaDesde, $cantidadDias, $servicioId);
      } else {
        $semanas = (int) ceil($cantidadDias / 6);
        $calendario = array_values($this->disponibilidadService->obtenerCalendario($fechaDesde, $semanas, $servicioId, false));
      }

      Response::success($calendario, "Calendario generado con éxito");
    } catch (Throwable $e) {
      Response::error("Error al calcular el calendario: " . $e->getMessage(), 500);
    }
  }

  /**
   * GET /api/horas-disponibles?fecha=YYYY-MM-DD&servicio_id=1
   *
   * Retorna los intervalos de horas disponibles para un día y servicio específico.
   *
   * @param Request $request
   * @return void
   */
  public function obtenerHorasDisponibles(Request $request): void
  {
    try {
      $fecha = (string) $request->getQuery('fecha', '');
      $servicioId = (int) $request->getQuery('servicio_id', 0);

      if (empty($fecha) || $servicioId <= 0) {
        Response::error("Se requiere la fecha (YYYY-MM-DD) y el servicio_id.", 422);
      }

      $horas = $this->disponibilidadService->obtenerHorasDisponibles($fecha, $servicioId);
      Response::success($horas, "Horarios disponibles calculados con éxito");
    } catch (Throwable $e) {
      Response::error("Error al obtener horarios disponibles: " . $e->getMessage(), 500);
    }
  }

  /**
   * POST /api/cliente/consultar
   * Body: { "telefono": "3312345678" }
   *
   * Busca si un paciente ya existe mediante su teléfono (Blind Index) para precargar su nombre.
   *
   * @param Request $request
   * @return void
   */
  public function consultarCliente(Request $request): void
  {
    try {
      $telefono = (string) $request->get('telefono', '');
      if (empty(trim($telefono))) {
        Response::error("El número de teléfono es obligatorio.", 422);
      }

      $cliente = $this->agendaService->consultarClientePorTelefono($telefono);
      if (!$cliente) {
        Response::success(null, "Cliente no registrado previamente");
      } else {
        Response::success($cliente, "Cliente encontrado");
      }
    } catch (Throwable $e) {
      Response::error("Error al consultar cliente: " . $e->getMessage(), 500);
    }
  }

  /**
   * POST /api/citas/agendar
   * Body: {
   *   "nombre_completo": "...",
   *   "telefono": "...",
   *   "servicio_id": 1,
   *   "fecha_cita": "YYYY-MM-DD",
   *   "hora_inicio": "HH:MM",
   *   "notas_cliente": "...",
   *   "medio_contacto": "whatsapp"|"llamada",
   *   "tiene_whatsapp": bool|null,
   *   "canal": "web"|"llamada"|"admin"
   * }
   *
   * Registra una nueva solicitud de cita de forma atómica con control de concurrencia y Web Push al administrador.
   *
   * @param Request $request
   * @return void
   */
  public function agendarCita(Request $request): void
  {
    try {
      $nombre = trim((string) $request->get('nombre_completo', ''));
      $telefonoRaw = $request->get('telefono');
      $telefono = $telefonoRaw !== null ? trim((string) $telefonoRaw) : null;
      $servicioId = (int) $request->get('servicio_id', 0);
      $fecha = trim((string) $request->get('fecha_cita', ''));
      $hora = trim((string) $request->get('hora_inicio', ''));
      $notas = $request->get('notas_cliente');

      // Medio de contacto: 'whatsapp' o 'llamada'
      $medioContactoRaw = strtolower(trim((string) $request->get('medio_contacto', 'whatsapp')));
      $medioContacto = in_array($medioContactoRaw, ['whatsapp', 'llamada'], true) ? $medioContactoRaw : 'whatsapp';

      // Canal de origen: 'web', 'llamada' o 'admin'
      $canalRaw = strtolower(trim((string) $request->get('canal', 'web')));
      $canal = in_array($canalRaw, ['web', 'llamada', 'admin'], true) ? $canalRaw : 'web';

      // Soporte explícito de tiene_whatsapp (si se envió en el payload)
      $tieneWhatsappRaw = $request->get('tiene_whatsapp');
      $tieneWhatsapp = null;
      if ($tieneWhatsappRaw !== null) {
        $tieneWhatsapp = filter_var($tieneWhatsappRaw, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
      }

      $errores = [];
      if (empty($nombre)) {
        $errores[] = "El nombre completo es obligatorio.";
      }
      // El teléfono es estrictamente obligatorio para reservas web públicas
      if ($canal !== 'admin' && empty($telefono)) {
        $errores[] = "El teléfono celular es obligatorio.";
      }
      if ($servicioId <= 0) {
        $errores[] = "Debe seleccionar un servicio válido.";
      }
      if (empty($fecha)) {
        $errores[] = "La fecha de la cita es obligatoria.";
      }
      if (empty($hora)) {
        $errores[] = "La hora de inicio es obligatoria.";
      }

      if (!empty($errores)) {
        Response::error("Datos incompletos para agendar la cita.", 422, $errores);
      }

      $resultado = $this->agendaService->agendarCita(
        nombreCompleto: $nombre,
        telefono: $telefono,
        servicioId: $servicioId,
        fechaCita: $fecha,
        horaInicio: $hora,
        notasCliente: $notas,
        medioContacto: $medioContacto,
        tieneWhatsapp: $tieneWhatsapp,
        canal: $canal
      );

      $mensajeRespuesta = $medioContacto === 'llamada'
        ? "Cita agendada con éxito. Procede a comunicarte por llamada telefónica."
        : "Cita agendada con éxito. Procede a enviar el WhatsApp.";

      Response::success($resultado, $mensajeRespuesta, 201);
    } catch (Throwable $e) {
      $mensaje = $e->getMessage();
      // Si se detecta conflicto de horario concurrente, devolver HTTP 409 Conflict
      $codigoHttp = (str_contains($mensaje, 'ya no se encuentra disponible') || str_contains($mensaje, 'conflicto'))
        ? 409
        : 400;

      Response::error($mensaje, $codigoHttp);
    }
  }

  /**
   * POST /api/admin/citas/agendar
   * Body: {
   *   "nombre_completo": "Paciente Presencial",
   *   "telefono": "3121000000"|null,
   *   "servicio_id": 1,
   *   "fecha_cita": "YYYY-MM-DD",
   *   "hora_inicio": "HH:MM",
   *   "notas_admin": "...",
   *   "notas_cliente": "...",
   *   "confirmar_inmediatamente": bool,
   *   "tiene_whatsapp": bool|null,
   *   "canal": "admin"|"llamada"
   * }
   *
   * Endpoint Administrativo: Registra una cita directamente desde el panel del terapeuta
   * con teléfono opcional, canal administrativo y confirmación inmediata opcional.
   *
   * @param Request $request
   * @return void
   */
  public function agendarCitaAdmin(Request $request): void
  {
    try {
      $nombre = trim((string) $request->get('nombre_completo', ''));
      $telefonoRaw = $request->get('telefono');
      $telefono = $telefonoRaw !== null && trim((string) $telefonoRaw) !== '' ? trim((string) $telefonoRaw) : null;
      $servicioId = (int) $request->get('servicio_id', 0);
      $fecha = trim((string) $request->get('fecha_cita', ''));
      $hora = trim((string) $request->get('hora_inicio', ''));
      $notasAdmin = $request->get('notas_admin');
      $notasCliente = $request->get('notas_cliente');

      $confirmarInmediatamente = filter_var(
        $request->get('confirmar_inmediatamente', false),
        FILTER_VALIDATE_BOOLEAN
      );

      $tieneWhatsappRaw = $request->get('tiene_whatsapp');
      $tieneWhatsapp = $tieneWhatsappRaw !== null
        ? filter_var($tieneWhatsappRaw, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE)
        : null;

      $canal = trim((string) $request->get('canal', 'admin'));
      if (empty($canal)) {
        $canal = 'admin';
      }

      $errores = [];
      if (empty($nombre)) {
        $errores[] = "El nombre del paciente es obligatorio.";
      }
      if ($servicioId <= 0) {
        $errores[] = "Debe seleccionar un servicio válido.";
      }
      if (empty($fecha)) {
        $errores[] = "La fecha de la cita es obligatoria.";
      }
      if (empty($hora)) {
        $errores[] = "La hora de inicio es obligatoria.";
      }

      if (!empty($errores)) {
        Response::error("Datos incompletos para el registro administrativo de la cita.", 422, $errores);
      }

      $resultado = $this->agendaService->agendarCitaAdmin(
        nombreCompleto: $nombre,
        telefono: $telefono,
        servicioId: $servicioId,
        fechaCita: $fecha,
        horaInicio: $hora,
        notasAdmin: $notasAdmin,
        notasCliente: $notasCliente,
        confirmarInmediatamente: $confirmarInmediatamente,
        tieneWhatsapp: $tieneWhatsapp,
        canal: $canal
      );

      Response::success($resultado, "Cita administrativa registrada con éxito", 201);
    } catch (Throwable $e) {
      $mensaje = $e->getMessage();
      $codigoHttp = (str_contains($mensaje, 'ocupado') || str_contains($mensaje, 'conflicto') || str_contains($mensaje, 'no labora') || str_contains($mensaje, 'no se encuentra disponible'))
        ? 409
        : 400;

      Response::error($mensaje, $codigoHttp);
    }
  }

  /**
   * GET /api/admin/solicitudes
   *
   * Retorna las citas en estado 'pendiente' para el panel administrativo, con teléfonos descifrados.
   *
   * @param Request $request
   * @return void
   */
  public function obtenerSolicitudesAdmin(Request $request): void
  {
    try {
      $solicitudes = $this->agendaService->obtenerSolicitudesPendientesAdmin();
      Response::success($solicitudes, "Solicitudes pendientes recuperadas con éxito");
    } catch (Throwable $e) {
      Response::error("Error al obtener solicitudes: " . $e->getMessage(), 500);
    }
  }

  /**
   * POST /api/admin/citas/confirmar
   * Body: { "cita_id": 1, "mensaje_admin": "Favor de traer ropa cómoda..." }
   *
   * Valida estado PENDIENTE, confirma la cita y genera el enlace de WhatsApp si el paciente dispone de él.
   *
   * @param Request $request
   * @return void
   */
  public function confirmarCita(Request $request): void
  {
    try {
      $citaId = (int) $request->get('cita_id', 0);
      $mensaje = $request->get('mensaje_admin');

      if ($citaId <= 0) {
        Response::error("El cita_id es obligatorio.", 422);
      }

      $resultado = $this->agendaService->confirmarCita($citaId, $mensaje);
      Response::success($resultado, "Cita confirmada con éxito");
    } catch (Throwable $e) {
      $mensaje = $e->getMessage();
      $codigoHttp = 400;
      if (str_contains($mensaje, 'no encontrada')) {
        $codigoHttp = 404;
      } elseif (str_contains($mensaje, 'no se encuentra en estado') || str_contains($mensaje, 'en espera de confirmación') || str_contains($mensaje, 'conflicto')) {
        $codigoHttp = 409;
      }

      Response::error($mensaje, $codigoHttp);
    }
  }

  /**
   * POST /api/admin/citas/cancelar
   * Body: { "cita_id": 1, "motivo": "Mantenimiento en instalaciones" }
   *
   * Cancela la cita y genera el mensaje de WhatsApp con el motivo si el paciente dispone de WhatsApp.
   *
   * @param Request $request
   * @return void
   */
  public function cancelarCita(Request $request): void
  {
    try {
      $citaId = (int) $request->get('cita_id', 0);
      $motivo = $request->get('motivo');

      if ($citaId <= 0) {
        Response::error("El cita_id es obligatorio.", 422);
      }

      $resultado = $this->agendaService->cancelarCita($citaId, $motivo);
      Response::success($resultado, "Cita cancelada con éxito");
    } catch (Throwable $e) {
      $mensaje = $e->getMessage();
      $codigoHttp = str_contains($mensaje, 'no encontrada') ? 404 : 400;
      Response::error($mensaje, $codigoHttp);
    }
  }

  /**
   * POST /api/admin/citas/actualizar
   * Body: {
   *   "cita_id": 1,
   *   "nueva_fecha": "YYYY-MM-DD",
   *   "nueva_hora": "HH:MM",
   *   "servicio_id": 2,
   *   "motivo": "Reprogramación a solicitud del paciente"
   * }
   *
   * Actualiza el horario de una cita validando días hábiles, bloqueos y conflictos de horario.
   *
   * @param Request $request
   * @return void
   */
  public function actualizarCita(Request $request): void
  {
    try {
      $citaId = (int) $request->get('cita_id', 0);
      $nuevaFecha = trim((string) $request->get('nueva_fecha', ''));
      $nuevaHora = trim((string) $request->get('nueva_hora', ''));
      $servicioId = $request->get('servicio_id') ? (int) $request->get('servicio_id') : null;
      $motivo = $request->get('motivo');

      if ($citaId <= 0 || empty($nuevaFecha) || empty($nuevaHora)) {
        Response::error("Faltan datos obligatorios (cita_id, nueva_fecha, nueva_hora).", 422);
      }

      $resultado = $this->agendaService->actualizarCita($citaId, $nuevaFecha, $nuevaHora, $servicioId, $motivo);
      Response::success($resultado, "Cita actualizada con éxito");
    } catch (Throwable $e) {
      $mensaje = $e->getMessage();
      $codigoHttp = 400;
      if (str_contains($mensaje, 'no encontrada')) {
        $codigoHttp = 404;
      } elseif (str_contains($mensaje, 'cerrado') || str_contains($mensaje, 'no labora') || str_contains($mensaje, 'bloqueado') || str_contains($mensaje, 'conflicto')) {
        $codigoHttp = 409;
      }

      Response::error($mensaje, $codigoHttp);
    }
  }
}
