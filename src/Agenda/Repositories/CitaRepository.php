<?php

namespace App\Agenda\Repositories;

use App\Agenda\Entities\Cita;
use App\Agenda\Entities\EstadoCita;
use App\Shared\Db\DataBase;
use App\Shared\Security\Encryption;
use Exception;

/**
 * Class CitaRepository
 *
 * Repositorio encargado de la persistencia, consulta y ciclo de vida de las reservas y citas.
 * Maneja operaciones de inserción atómica, búsqueda por ID y código público, cambio de estados,
 * verificación de traslapes y extracción de solicitudes para el panel administrativo.
 *
 * @package App\Agenda\Repositories
 */
class CitaRepository
{
  /**
   * Conexión a la base de datos MySQL.
   */
  private DataBase $db;

  /**
   * Servicio de cifrado para descifrar teléfonos en vistas administrativas.
   */
  private Encryption $crypto;

  /**
   * Constructor del repositorio.
   *
   * @param DataBase|null $db Instancia de DataBase o Singleton.
   * @param Encryption|null $crypto Servicio de cifrado o instancia nueva.
   */
  public function __construct(?DataBase $db = null, ?Encryption $crypto = null)
  {
    $this->db = $db ?? DataBase::getInstance();
    $this->crypto = $crypto ?? new Encryption();
  }

  /**
   * Genera un código único alfanumérico para la cita (ej. CN-20260914-A8F2).
   *
   * @return string
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
   * @param Cita $cita Entidad Cita a persistir.
   * @return int ID de la cita recién creada.
   * @throws Exception Si la inserción SQL falla.
   */
  public function crear(Cita $cita): int
  {
    if (empty($cita->getCodigoCita())) {
      $cita->setCodigoCita(self::generarCodigo());
    }

    $sql = "INSERT INTO citas (
              codigo_cita, cliente_id, servicio_id, fecha_cita,
              hora_inicio, hora_fin, estado, tiene_whatsapp, canal,
              notas_cliente, notas_admin
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    $this->db->execute($sql, [
      $cita->getCodigoCita(),
      $cita->getClienteId(),
      $cita->getServicioId(),
      $cita->getFechaCita(),
      $cita->getHoraInicio(),
      $cita->getHoraFin(),
      $cita->getEstado()->value,
      $cita->tieneWhatsapp() ? 1 : 0,
      $cita->getCanal(),
      $cita->getNotasCliente(),
      $cita->getNotasAdmin()
    ]);

    $id = (int) $this->db->lastInsertId();
    $cita->setId($id);
    return $id;
  }

  /**
   * Busca una cita por su ID primario.
   *
   * @param int $id Identificador primario.
   * @return Cita|null
   */
  public function buscarPorId(int $id): ?Cita
  {
    $sql = "SELECT id, codigo_cita, cliente_id, servicio_id, fecha_cita,
                   hora_inicio, hora_fin, estado, tiene_whatsapp, canal,
                   notas_cliente, notas_admin, created_at, updated_at
            FROM citas
            WHERE id = ?
            LIMIT 1";

    return $this->db->fetchOne($sql, [$id], fn(array $row) => Cita::fromArray($row));
  }

  /**
   * Busca una cita por su código público alfanumérico.
   *
   * @param string $codigoCita Código público (ej. CN-20260914-A8F2).
   * @return Cita|null
   */
  public function buscarPorCodigo(string $codigoCita): ?Cita
  {
    $sql = "SELECT id, codigo_cita, cliente_id, servicio_id, fecha_cita,
                   hora_inicio, hora_fin, estado, tiene_whatsapp, canal,
                   notas_cliente, notas_admin, created_at, updated_at
            FROM citas
            WHERE codigo_cita = ?
            LIMIT 1";

    return $this->db->fetchOne($sql, [$codigoCita], fn(array $row) => Cita::fromArray($row));
  }

  /**
   * Cambia el estado de una cita y registra opcionalmente una nota o motivo administrativo.
   *
   * @param int $id ID de la cita.
   * @param EstadoCita $nuevoEstado Nuevo estado de la cita.
   * @param string|null $motivoAdmin Motivo o indicaciones adicionales del terapeuta.
   * @return bool True si se actualizó el registro.
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
   * Actualiza los datos de una cita existente.
   *
   * @param Cita $cita Entidad con los datos modificados.
   * @return bool True si se actualizó al menos una fila.
   */
  public function actualizar(Cita $cita): bool
  {
    $sql = "UPDATE citas
            SET servicio_id = ?, fecha_cita = ?, hora_inicio = ?, hora_fin = ?,
                estado = ?, tiene_whatsapp = ?, canal = ?,
                notas_cliente = ?, notas_admin = ?
            WHERE id = ?";

    return $this->db->execute($sql, [
      $cita->getServicioId(),
      $cita->getFechaCita(),
      $cita->getHoraInicio(),
      $cita->getHoraFin(),
      $cita->getEstado()->value,
      $cita->tieneWhatsapp() ? 1 : 0,
      $cita->getCanal(),
      $cita->getNotasCliente(),
      $cita->getNotasAdmin(),
      $cita->getId()
    ]) > 0;
  }

  /**
   * Elimina una cita de la base de datos por su ID.
   *
   * @param int $id
   * @return bool
   */
  public function eliminar(int $id): bool
  {
    $sql = "DELETE FROM citas WHERE id = ?";
    return $this->db->execute($sql, [$id]) > 0;
  }

  /**
   * Obtiene las citas registradas en un rango de fechas para el cálculo de disponibilidad.
   *
   * @param string $fechaInicio Fecha inicial en formato YYYY-MM-DD.
   * @param string $fechaFin Fecha final en formato YYYY-MM-DD.
   * @param string[] $estados Lista de estados a considerar (por defecto pendientes y confirmadas).
   * @return Cita[]
   */
  public function obtenerPorRangoFechas(string $fechaInicio, string $fechaFin, array $estados = ['pendiente', 'confirmada']): array
  {
    if (empty($estados)) {
      $sql = "SELECT * FROM citas WHERE fecha_cita BETWEEN ? AND ? ORDER BY fecha_cita ASC, hora_inicio ASC";
      return $this->db->fetchAll($sql, [$fechaInicio, $fechaFin], fn(array $row) => Cita::fromArray($row));
    }

    $placeholders = implode(',', array_fill(0, count($estados), '?'));
    $sql = "SELECT * FROM citas
            WHERE fecha_cita BETWEEN ? AND ?
              AND estado IN ({$placeholders})
            ORDER BY fecha_cita ASC, hora_inicio ASC";
    $params = array_merge([$fechaInicio, $fechaFin], $estados);

    return $this->db->fetchAll($sql, $params, fn(array $row) => Cita::fromArray($row));
  }

  /**
   * Comprueba si existe colisión o traslape con alguna cita existente (pendiente o confirmada).
   *
   * @param string $fecha Fecha en formato YYYY-MM-DD.
   * @param string $horaInicio Hora de inicio en formato HH:MM:SS.
   * @param string $horaFin Hora de culminación en formato HH:MM:SS.
   * @param int|null $excluirCitaId ID de cita a excluir (para reprogramaciones).
   * @return bool True si existe conflicto de horario.
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
   * Obtiene todas las solicitudes pendientes de confirmación para el panel administrativo.
   *
   * Descifra de forma segura el teléfono del cliente a texto plano y remueve el campo binario cifrado
   * en un único paso de streaming, garantizando eficiencia de memoria y respuestas limpias.
   *
   * @return array<int, array<string, mixed>>
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
              c.tiene_whatsapp,
              c.canal,
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

    return $this->db->fetchAll($sql, [], function (array $row): array {
      $encryptedPhone = $row['telefono_encriptado'] ?? null;
      $row['cliente_telefono'] = (!empty($encryptedPhone)) ? $this->crypto->decrypt($encryptedPhone) : null;
      unset($row['telefono_encriptado']);
      return $row;
    });
  }

  /**
   * Obtiene citas con detalles de cliente en un rango de fechas, útil para el calendario admin.
   *
   * @param string $fechaInicio
   * @param string $fechaFin
   * @param string|null $estado Filtro opcional
   * @return array
   */
  public function obtenerDetallesPorRangoFechas(string $fechaInicio, string $fechaFin, ?string $estado = null): array
  {
    $sql = "SELECT
              c.id AS cita_id,
              c.codigo_cita,
              c.fecha_cita,
              c.hora_inicio,
              c.hora_fin,
              c.estado,
              c.tiene_whatsapp,
              c.canal,
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
            WHERE c.fecha_cita BETWEEN ? AND ?";
    
    $params = [$fechaInicio, $fechaFin];
    
    if ($estado) {
      $sql .= " AND c.estado = ?";
      $params[] = $estado;
    }
    
    $sql .= " ORDER BY c.fecha_cita ASC, c.hora_inicio ASC";

    return $this->db->fetchAll($sql, $params, function (array $row): array {
      $encryptedPhone = $row['telefono_encriptado'] ?? null;
      $row['cliente_telefono'] = (!empty($encryptedPhone)) ? $this->crypto->decrypt($encryptedPhone) : null;
      unset($row['telefono_encriptado']);
      return $row;
    });
  }
}
