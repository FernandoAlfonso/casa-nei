<?php

namespace App\Agenda\Repositories;

use App\Agenda\Entities\BloqueoAgenda;
use App\Agenda\Entities\HorarioAtencion;
use App\Shared\Db\DataBase;

/**
 * Class HorarioRepository
 *
 * Repositorio para la consulta y administración de horarios de atención semanales
 * y bloqueos de agenda (días festivos, vacaciones, descansos extraordinarios).
 *
 * @package App\Agenda\Repositories
 */
class HorarioRepository
{
  /**
   * Conexión a la base de datos MySQL.
   */
  private DataBase $db;

  /**
   * Constructor del repositorio.
   *
   * @param DataBase|null $db Instancia de DataBase o Singleton.
   */
  public function __construct(?DataBase $db = null)
  {
    $this->db = $db ?? DataBase::getInstance();
  }

  /**
   * Obtiene la lista de horarios semanales activos (ordenados de Domingo a Sábado).
   *
   * @return HorarioAtencion[] Arreglo de entidades HorarioAtencion activas.
   */
  public function obtenerHorariosSemanales(): array
  {
    $sql = "SELECT id, dia_semana, hora_inicio, hora_fin, activo 
            FROM horarios_atencion 
            WHERE activo = 1 
            ORDER BY dia_semana ASC";

    return $this->db->fetchAll($sql, [], fn(array $r) => HorarioAtencion::fromArray($r));
  }

  /**
   * Obtiene el horario de atención para un día de la semana específico (0=Domingo, 1=Lunes, ...).
   *
   * @param int $diaSemana Número de día de la semana (0 a 6).
   * @return HorarioAtencion|null Entidad HorarioAtencion si labora ese día o null si no labora.
   */
  public function obtenerPorDiaSemana(int $diaSemana): ?HorarioAtencion
  {
    $sql = "SELECT id, dia_semana, hora_inicio, hora_fin, activo 
            FROM horarios_atencion 
            WHERE dia_semana = ? AND activo = 1 
            LIMIT 1";

    return $this->db->fetchOne($sql, [$diaSemana], fn(array $row) => HorarioAtencion::fromArray($row));
  }

  /**
   * Obtiene los bloqueos de agenda registrados en un rango de fechas.
   *
   * @param string $fechaInicio Fecha inicial en formato YYYY-MM-DD.
   * @param string $fechaFin Fecha final en formato YYYY-MM-DD.
   * @return BloqueoAgenda[] Lista de bloqueos encontrados en el rango.
   */
  public function obtenerBloqueosEnRango(string $fechaInicio, string $fechaFin): array
  {
    $sql = "SELECT id, fecha, hora_inicio, hora_fin, motivo 
            FROM bloqueos_agenda 
            WHERE fecha BETWEEN ? AND ? 
            ORDER BY fecha ASC, hora_inicio ASC";

    return $this->db->fetchAll($sql, [$fechaInicio, $fechaFin], fn(array $r) => BloqueoAgenda::fromArray($r));
  }

  /**
   * Registra y persiste un nuevo bloqueo extraordinario en la agenda.
   *
   * @param BloqueoAgenda $bloqueo Entidad con los datos del bloqueo a crear.
   * @return int ID del bloqueo recién creado.
   */
  public function crearBloqueo(BloqueoAgenda $bloqueo): int
  {
    $sql = "INSERT INTO bloqueos_agenda (fecha, hora_inicio, hora_fin, motivo) 
            VALUES (?, ?, ?, ?)";

    $this->db->execute($sql, [
      $bloqueo->getFecha(),
      $bloqueo->getHoraInicio(),
      $bloqueo->getHoraFin(),
      $bloqueo->getMotivo()
    ]);

    return (int) $this->db->lastInsertId();
  }

  /**
   * Elimina un bloqueo extraordinario por su identificador primario.
   *
   * @param int $id ID del bloqueo a eliminar.
   * @return bool True si se eliminó al menos un registro.
   */
  public function eliminarBloqueo(int $id): bool
  {
    $sql = "DELETE FROM bloqueos_agenda WHERE id = ?";
    return $this->db->execute($sql, [$id]) > 0;
  }
}
