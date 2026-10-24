<?php

namespace App\Agenda\Controllers;

use App\Agenda\Entities\BloqueoAgenda;
use App\Agenda\Entities\Servicio;
use App\Agenda\Repositories\ClienteRepository;
use App\Agenda\Repositories\HorarioRepository;
use App\Agenda\Repositories\ServicioRepository;
use App\Shared\Http\Request;
use App\Shared\Http\Response;
use Throwable;

/**
 * ConfigController - Controlador para administrar la configuración del sistema (CRUD).
 *
 * Expone endpoints REST para administrar:
 * - Servicios
 * - Horarios de Atención Semanales
 * - Bloqueos de Agenda
 * - Clientes
 *
 * @package App\Agenda\Controllers
 */
class ConfigController
{
  private ServicioRepository $servicioRepo;
  private HorarioRepository $horarioRepo;
  private ClienteRepository $clienteRepo;

  public function __construct(
    ?ServicioRepository $servicioRepo = null,
    ?HorarioRepository $horarioRepo = null,
    ?ClienteRepository $clienteRepo = null
  ) {
    $this->servicioRepo = $servicioRepo ?? new ServicioRepository();
    $this->horarioRepo = $horarioRepo ?? new HorarioRepository();
    $this->clienteRepo = $clienteRepo ?? new ClienteRepository();
  }

  // ==========================================
  // SERVICIOS
  // ==========================================

  public function listarServicios(Request $request): void
  {
    try {
      $servicios = $this->servicioRepo->obtenerTodos();
      Response::success($servicios, "Servicios recuperados");
    } catch (Throwable $e) {
      Response::error("Error al obtener servicios: " . $e->getMessage(), 500);
    }
  }

  public function crearServicio(Request $request): void
  {
    try {
      $horarioPersonalizado = $this->sanitizarHorarioPersonalizado($request->get('horario_personalizado'));

      $servicio = new Servicio(
        id: 0,
        nombre: (string) $request->get('nombre', ''),
        descripcion: $request->get('descripcion'),
        instrucciones: $request->get('instrucciones'),
        duracionMinutos: (int) $request->get('duracion_minutos', 60),
        precio: $request->get('precio') !== null && $request->get('precio') !== '' ? (float) $request->get('precio') : null,
        activo: (bool) $request->get('activo', true),
        horarioPersonalizado: $horarioPersonalizado
      );

      $id = $this->servicioRepo->crear($servicio);
      Response::success(['id' => $id], "Servicio creado con éxito");
    } catch (Throwable $e) {
      Response::error("Error al crear servicio: " . $e->getMessage(), 500);
    }
  }

  public function actualizarServicio(Request $request): void
  {
    try {
      $id = (int) $request->get('id');
      if (!$id) {
        Response::error("ID de servicio requerido", 400);
      }

      $horarioPersonalizado = $this->sanitizarHorarioPersonalizado($request->get('horario_personalizado'));

      $servicio = new Servicio(
        id: $id,
        nombre: (string) $request->get('nombre', ''),
        descripcion: $request->get('descripcion'),
        instrucciones: $request->get('instrucciones'),
        duracionMinutos: (int) $request->get('duracion_minutos', 60),
        precio: $request->get('precio') !== null && $request->get('precio') !== '' ? (float) $request->get('precio') : null,
        activo: (bool) $request->get('activo', true),
        horarioPersonalizado: $horarioPersonalizado
      );

      $this->servicioRepo->actualizar($servicio);
      Response::success([], "Servicio actualizado con éxito");
    } catch (Throwable $e) {
      Response::error("Error al actualizar servicio: " . $e->getMessage(), 500);
    }
  }

  /**
   * Valida y sanitiza la estructura del bloque horario_personalizado.
   *
   * @param mixed $rawHorario
   * @return array<int, array{dias: int[], hora_inicio: string, hora_fin: string}>|null
   */
  private function sanitizarHorarioPersonalizado(mixed $rawHorario): ?array
  {
    if (is_string($rawHorario)) {
      $rawHorario = json_decode($rawHorario, true);
    }

    if (empty($rawHorario) || !is_array($rawHorario)) {
      return null;
    }

    $bloquesLimpios = [];
    foreach ($rawHorario as $bloque) {
      if (!is_array($bloque)) {
        continue;
      }

      $diasRaw = is_array($bloque['dias'] ?? null) ? $bloque['dias'] : [];
      $diasValidos = [];
      foreach ($diasRaw as $d) {
        if (is_numeric($d)) {
          $val = (int) $d;
          if ($val >= 0 && $val <= 7) {
            $diasValidos[] = $val;
          }
        }
      }
      $dias = array_values(array_unique($diasValidos));
      sort($dias);

      $inicio = trim((string) ($bloque['hora_inicio'] ?? ''));
      $fin    = trim((string) ($bloque['hora_fin'] ?? ''));

      if (!empty($dias) && preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $inicio) && preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $fin)) {
        $inicioCorta = substr($inicio, 0, 5);
        $finCorta = substr($fin, 0, 5);
        if ($inicioCorta < $finCorta) {
          $bloquesLimpios[] = [
            'dias'        => $dias,
            'hora_inicio' => $inicioCorta,
            'hora_fin'    => $finCorta
          ];
        }
      }
    }

    return !empty($bloquesLimpios) ? $bloquesLimpios : null;
  }

  // ==========================================
  // HORARIOS
  // ==========================================

  public function listarHorarios(Request $request): void
  {
    try {
      $horarios = $this->horarioRepo->obtenerTodosSemanales();
      Response::success($horarios, "Horarios recuperados");
    } catch (Throwable $e) {
      Response::error("Error al obtener horarios: " . $e->getMessage(), 500);
    }
  }

  public function actualizarHorario(Request $request): void
  {
    try {
      $diaSemana = $request->get('dia_semana');
      $horarios = $request->get('horarios');
      $activo = (bool) $request->get('activo');

      if ($diaSemana === null) {
        Response::error("Día de la semana requerido", 400);
      }
      
      $horarios = is_array($horarios) ? $horarios : [];

      $this->horarioRepo->reemplazarHorariosDia((int)$diaSemana, $horarios, $activo);
      Response::success([], "Horario actualizado con éxito");
    } catch (Throwable $e) {
      Response::error("Error al actualizar horario: " . $e->getMessage(), 500);
    }
  }

  // ==========================================
  // BLOQUEOS
  // ==========================================

  public function listarBloqueos(Request $request): void
  {
    try {
      $bloqueos = $this->horarioRepo->obtenerTodosBloqueosFuturos();
      Response::success($bloqueos, "Bloqueos recuperados");
    } catch (Throwable $e) {
      Response::error("Error al obtener bloqueos: " . $e->getMessage(), 500);
    }
  }

  public function crearBloqueo(Request $request): void
  {
    try {
      $fecha = (string) $request->get('fecha');
      $horaInicio = (string) $request->get('hora_inicio', '00:00:00');
      $horaFin = (string) $request->get('hora_fin', '23:59:59');
      $motivo = (string) $request->get('motivo');

      if (empty($fecha)) {
        Response::error("Fecha requerida", 400);
      }

      $bloqueo = new BloqueoAgenda(
        id: 0,
        fecha: $fecha,
        horaInicio: $horaInicio,
        horaFin: $horaFin,
        motivo: $motivo
      );

      $id = $this->horarioRepo->crearBloqueo($bloqueo);
      Response::success(['id' => $id], "Bloqueo creado con éxito");
    } catch (Throwable $e) {
      Response::error("Error al crear bloqueo: " . $e->getMessage(), 500);
    }
  }

  public function eliminarBloqueo(Request $request): void
  {
    try {
      $id = (int) $request->get('id');
      if (!$id) {
        Response::error("ID requerido", 400);
      }

      $this->horarioRepo->eliminarBloqueo($id);
      Response::success([], "Bloqueo eliminado");
    } catch (Throwable $e) {
      Response::error("Error al eliminar bloqueo: " . $e->getMessage(), 500);
    }
  }

  // ==========================================
  // CLIENTES
  // ==========================================

  public function listarClientes(Request $request): void
  {
    try {
      $limite = (int) $request->getQuery('limite', 100);
      $clientes = $this->clienteRepo->obtenerTodos($limite);
      Response::success($clientes, "Clientes recuperados");
    } catch (Throwable $e) {
      Response::error("Error al obtener clientes: " . $e->getMessage(), 500);
    }
  }

  public function actualizarCliente(Request $request): void
  {
    try {
      $id = (int) $request->get('id');
      $nombre = (string) $request->get('nombre_completo');
      $telefono = $request->get('telefono'); // optional

      if (!$id || empty($nombre)) {
        Response::error("ID y nombre son requeridos", 400);
      }

      $this->clienteRepo->actualizar($id, $nombre, $telefono);
      Response::success([], "Cliente actualizado");
    } catch (Throwable $e) {
      Response::error("Error al actualizar cliente: " . $e->getMessage(), 500);
    }
  }
}
