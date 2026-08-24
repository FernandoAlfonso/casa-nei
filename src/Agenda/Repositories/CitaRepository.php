<?php

namespace App\Agenda\Repositories;

use App\Agenda\Entities\Cita;
use App\Agenda\Entities\EstadoCita;
use App\Shared\Db\DataBase;
use Exception;

/**
 * CitaRepository - Repositorio para la gestión de citas y solicitudes de agenda.
 */
class CitaRepository
{
  private DataBase $db;

  public function __construct(?DataBase $db = null)
  {
    $this->db = $db ?? DataBase::getInstance();
  }

  /**
   * Genera un código único alfanumérico para la cita (ej. CN-20260823-A8F2).
   */
  public static function generarCodigo(): string
  {
    $fecha = date('Ymd');
    $sufijo = strtoupper(substr(bin2hex(random_bytes(4)), 0, 4));
    return "CN-{$fecha}-{$sufijo}";
  }

  /**
   * Registra una nueva cita en la base de datos.
   *
   * @throws Exception
   */
  public function crear(Cita $cita): int
  {
    if (empty($cita->getCodigoCita())) {
      $cita->setCodigoCita(self::generarCodigo());
    }

    $sql = "INSERT INTO citas (
              codigo_cita, cliente_id, servicio_id, fecha_cita,
              hora_inicio, hora_fin, estado, notas_cliente, notas_admin
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

    $this->db->execute($sql, [
      $cita->getCodigoCita(),
      $cita->getClienteId(),
      $cita->getServicioId(),
      $cita->getFechaCita(),
      $cita->getHoraInicio(),
      $cita->getHoraFin(),
      $cita->getEstado()->value,
      $cita->getNotasCliente(),
      $cita->getNotasAdmin()
    ]);

    $id = (int) $this->db->lastInsertId();
    $cita->setId($id);
    return $id;
  }

  /**
   * Busca una cita por su ID primario.
   */
  public function buscarPorId(int $id): ?Cita
  {
    $sql = "SELECT id, codigo_cita, cliente_id, servicio_id, fecha_cita,
                   hora_inicio, hora_fin, estado, notas_cliente, notas_admin,
                   created_at, updated_at
            FROM citas
            WHERE id = ?
            LIMIT 1";

    $row = $this->db->fetchOne($sql, [$id]);
    return $row ? Cita::fromArray($row) : null;
  }

  /**
   * Busca una cita por su código público alfanumérico.
   */
  public function buscarPorCodigo(string $codigoCita): ?Cita
  {
    $sql = "SELECT id, codigo_cita, cliente_id, servicio_id, fecha_cita,
                   hora_inicio, hora_fin, estado, notas_cliente, notas_admin,
                   created_at, updated_at
            FROM citas
            WHERE codigo_cita = ?
            LIMIT 1";

    $row = $this->db->fetchOne($sql, [$codigoCita]);
    return $row ? Cita::fromArray($row) : null;
  }

  /**
   * Cambia el estado de una cita (confirmar, cancelar, rechazar, etc.)
   * y permite registrar opcionalmente un motivo/nota del administrador.
   */
  public function cambiarEstado(int $id, EstadoCita $nuevoEstado, ?string $motivoAdmin = null): bool
  {
    if ($motivoAdmin !== null) {
      $sql = "UPDATE citas SET estado = ?, notas_admin = ? WHERE id = ?";
      return $this->db->execute($sql, [$nuevoEstado->value, $motivoAdmin, $id]) > 0;
    }

    $sql = "UPDATE citas SET estado = ? WHERE id = ?";
    return $this->db->execute($sql, [$nuevoEstado->value, $id]) > 0;
  }

  /**
   * Actualiza los datos de una cita existente (fecha, hora, servicio o notas).
   */
  public function actualizar(Cita $cita): bool
  {
    $sql = "UPDATE citas
            SET servicio_id = ?, fecha_cita = ?, hora_inicio = ?, hora_fin = ?,
                estado = ?, notas_cliente = ?, notas_admin = ?
            WHERE id = ?";

    return $this->db->execute($sql, [
      $cita->getServicioId(),
      $cita->getFechaCita(),
      $cita->getHoraInicio(),
      $cita->getHoraFin(),
      $cita->getEstado()->value,
      $cita->getNotasCliente(),
      $cita->getNotasAdmin(),
      $cita->getId()
    ]) > 0;
  }

  /**
   * Elimina una cita de la base de datos por su ID.
   */
  public function eliminar(int $id): bool
  {
    $sql = "DELETE FROM citas WHERE id = ?";
    return $this->db->execute($sql, [$id]) > 0;
  }

  /**
   * Obtiene las citas activas o pendientes en un rango de fechas para calcular disponibilidad.
   *
   * @param string $fechaInicio Formato YYYY-MM-DD
   * @param string $fechaFin Formato YYYY-MM-DD
   * @param array $estados Filtro opcional de estados (por defecto: pendientes y confirmadas)
   * @return Cita[]
   */
  public function obtenerPorRangoFechas(string $fechaInicio, string $fechaFin, array $estados = ['pendiente', 'confirmada']): array
  {
    if (empty($estados)) {
      $sql = "SELECT * FROM citas WHERE fecha_cita BETWEEN ? AND ? ORDER BY fecha_cita ASC, hora_inicio ASC";
      $rows = $this->db->fetchAll($sql, [$fechaInicio, $fechaFin]);
    } else {
      $placeholders = implode(',', array_fill(0, count($estados), '?'));
      $sql = "SELECT * FROM citas
              WHERE fecha_cita BETWEEN ? AND ?
                AND estado IN ({$placeholders})
              ORDER BY fecha_cita ASC, hora_inicio ASC";
      $params = array_merge([$fechaInicio, $fechaFin], $estados);
      $rows = $this->db->fetchAll($sql, $params);
    }

    return array_map(fn($row) => Cita::fromArray($row), $rows);
  }

  /**
   * Comprueba si ya existe una cita confirmada o pendiente que choque con el horario dado.
   */
  public function existeConflictoHorario(string $fecha, string $horaInicio, string $horaFin, ?int $excluirCitaId = null): bool
  {
    $sql = "SELECT COUNT(*) FROM citas
            WHERE fecha_cita = ?
              AND estado IN ('pendiente', 'confirmada')
              AND (
                (hora_inicio < ? AND hora_fin > ?)
              )";
    $params = [$fecha, $horaFin, $horaInicio];

    if ($excluirCitaId !== null) {
      $sql .= " AND id != ?";
      $params[] = $excluirCitaId;
    }

    return (int) $this->db->fetchColumn($sql, $params) > 0;
  }

  /**
   * Obtiene todas las solicitudes pendientes de confirmación con datos del cliente y servicio
   * para la vista del panel administrativo.
   */
  public function obtenerSolicitudesPendientes(): array
  {
    $sql = "SELECT
              c.id AS cita_id,
              c.codigo_cita,
              c.fecha_cita,
              c.hora_inicio,
              c.hora_fin,
              c.estado,
              c.notas_cliente,
              c.notas_admin,
              c.created_at AS fecha_solicitud,
              cl.id AS cliente_id,
              cl.nombre_completo AS cliente_nombre,
              cl.telefono_encriptado,
              s.id AS servicio_id,
              s.nombre AS servicio_nombre,
              s.duracion_minutos,
              s.precio AS servicio_precio
            FROM citas c
            INNER JOIN clientes cl ON c.cliente_id = cl.id
            INNER JOIN servicios s ON c.servicio_id = s.id
            WHERE c.estado = 'pendiente'
            ORDER BY c.fecha_cita ASC, c.hora_inicio ASC";

    return $this->db->fetchAll($sql);
  }
}
