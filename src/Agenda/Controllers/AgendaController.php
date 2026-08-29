<?php

namespace App\Agenda\Controllers;

use App\Agenda\Repositories\CitaRepository;
use App\Agenda\Repositories\ServicioRepository;
use App\Agenda\Services\AgendaService;
use App\Agenda\Services\DisponibilidadService;
use App\Shared\Http\Request;
use App\Shared\Http\Response;
use Exception;

/**
 * AgendaController - Controlador para manejar las peticiones HTTP del módulo de Agenda.
 */
class AgendaController
{
  public function __construct(
    private AgendaService $agendaService = new AgendaService(),
    private DisponibilidadService $disponibilidadService = new DisponibilidadService(),
    private ServicioRepository $servicioRepo = new ServicioRepository(),
    private CitaRepository $citaRepo = new CitaRepository()
  ) {
  }

  /**
   * GET /api/servicios
   * Retorna el catálogo de servicios activos con precios y duración.
   */
  public function obtenerServicios(Request $request): void
  {
    try {
      $servicios = $this->servicioRepo->obtenerActivos();
      $data = array_map(fn($s) => $s->toArray(), $servicios);
      Response::success($data, "Servicios recuperados con éxito");
    } catch (Exception $e) {
      Response::error("Error al obtener los servicios: " . $e->getMessage(), 500);
    }
  }

  /**
   * GET /api/calendario?fecha_desde=YYYY-MM-DD&servicio_id=1&semanas=4
   * Retorna el estado de disponibilidad día por día para las próximas semanas.
   */
  public function obtenerCalendario(Request $request): void
  {
    try {
      $fechaDesde = $request->getQuery('fecha_desde');
      $semanas = (int) $request->getQuery('semanas', 4);
      $servicioId = $request->getQuery('servicio_id') ? (int) $request->getQuery('servicio_id') : null;

      $calendario = $this->disponibilidadService->obtenerCalendario($fechaDesde, $semanas, $servicioId);
      Response::success(array_values($calendario), "Calendario generado con éxito");
    } catch (Exception $e) {
      Response::error("Error al calcular el calendario: " . $e->getMessage(), 500);
    }
  }

  /**
   * GET /api/horas-disponibles?fecha=YYYY-MM-DD&servicio_id=1
   * Retorna los intervalos de horas disponibles para un día y servicio específico.
   */
  public function obtenerHorasDisponibles(Request $request): void
  {
    try {
      $fecha = $request->getQuery('fecha');
      $servicioId = (int) $request->getQuery('servicio_id');

      if (empty($fecha) || $servicioId <= 0) {
        Response::error("Se requiere la fecha (YYYY-MM-DD) y el servicio_id.", 422);
      }

      $horas = $this->disponibilidadService->obtenerHorasDisponibles($fecha, $servicioId);
      Response::success($horas, "Horarios disponibles calculados con éxito");
    } catch (Exception $e) {
      Response::error("Error al obtener horarios disponibles: " . $e->getMessage(), 500);
    }
  }

  /**
   * POST /api/cliente/consultar
   * Body: { "telefono": "3312345678" }
   * Busca si el número ya existe para precargar el nombre y evitar duplicidad.
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
    } catch (Exception $e) {
      Response::error("Error al consultar cliente: " . $e->getMessage(), 500);
    }
  }

  /**
   * POST /api/citas/agendar
   * Body: { "nombre_completo", "telefono", "servicio_id", "fecha_cita", "hora_inicio", "notas_cliente" }
   * Registra la cita y retorna el código y enlace de WhatsApp para el Administrador.
   */
  public function agendarCita(Request $request): void
  {
    try {
      $nombre = trim((string) $request->get('nombre_completo', ''));
      $telefono = trim((string) $request->get('telefono', ''));
      $servicioId = (int) $request->get('servicio_id', 0);
      $fecha = trim((string) $request->get('fecha_cita', ''));
      $hora = trim((string) $request->get('hora_inicio', ''));
      $notas = $request->get('notas_cliente');

      $errores = [];
      if (empty($nombre)) $errores[] = "El nombre completo es obligatorio.";
      if (empty($telefono)) $errores[] = "El teléfono es obligatorio.";
      if ($servicioId <= 0) $errores[] = "Debe seleccionar un servicio válido.";
      if (empty($fecha)) $errores[] = "La fecha de la cita es obligatoria.";
      if (empty($hora)) $errores[] = "La hora de inicio es obligatoria.";

      if (!empty($errores)) {
        Response::error("Datos incompletos para agendar la cita.", 422, $errores);
      }

      $resultado = $this->agendaService->agendarCita(
        nombreCompleto: $nombre,
        telefono: $telefono,
        servicioId: $servicioId,
        fechaCita: $fecha,
        horaInicio: $hora,
        notasCliente: $notas
      );

      Response::success($resultado, "Cita agendada con éxito. Procede a enviar el WhatsApp.", 201);
    } catch (Exception $e) {
      Response::error($e->getMessage(), 400);
    }
  }

  /**
   * GET /api/admin/solicitudes
   * Retorna las citas en estado 'pendiente' para el panel administrativo.
   */
  public function obtenerSolicitudesAdmin(Request $request): void
  {
    try {
      $solicitudes = $this->citaRepo->obtenerSolicitudesPendientes();
      Response::success($solicitudes, "Solicitudes pendientes recuperadas con éxito");
    } catch (Exception $e) {
      Response::error("Error al obtener solicitudes: " . $e->getMessage(), 500);
    }
  }

  /**
   * POST /api/admin/citas/confirmar
   * Body: { "cita_id": 1, "mensaje_admin": "Favor de traer ropa cómoda..." }
   * Confirma la cita y genera el enlace de WhatsApp para el paciente.
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
    } catch (Exception $e) {
      Response::error($e->getMessage(), 400);
    }
  }

  /**
   * POST /api/admin/citas/cancelar
   * Body: { "cita_id": 1, "motivo": "Mantenimiento en instalaciones" }
   * Cancela la cita y genera el mensaje de WhatsApp con el motivo.
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
    } catch (Exception $e) {
      Response::error($e->getMessage(), 400);
    }
  }

  /**
   * POST /api/admin/citas/actualizar
   * Body: { "cita_id": 1, "nueva_fecha": "...", "nueva_hora": "...", "servicio_id": 2, "motivo": "..." }
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
    } catch (Exception $e) {
      Response::error($e->getMessage(), 400);
    }
  }
}
