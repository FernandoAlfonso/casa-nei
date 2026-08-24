<?php

namespace App\Agenda\Repositories;

use App\Agenda\Entities\HorarioAtencion;
use App\Agenda\Entities\BloqueoAgenda;
use App\Shared\Db\DataBase;

/**
 * HorarioRepository - Repositorio para consultar horarios de atención semanales y bloqueos de agenda.
 */
class HorarioRepository
{
  private DataBase $db;

  public function __construct(?DataBase $db = null)
  {
    $this->db = $db ?? DataBase::getInstance();
  }

  /**
   * Obtiene la lista de horarios semanales activos (ordenados de Domingo a Sábado).
   *
   * @return HorarioAtencion[]
   */
  public function obtenerHorariosSemanales(): array
  {
    $sql = "SELECT id, dia_semana, hora_inicio, hora_fin, activo 
            FROM horarios_atencion 
            WHERE activo = 1 
            ORDER BY dia_semana ASC";

    $rows = $this->db->fetchAll($sql);
    return array_map(fn($r) => HorarioAtencion::fromArray($r), $rows);
  }

  /**
   * Obtiene el horario de atención para un día de la semana específico (0=Domingo, 1=Lunes, ...).
   */
  public function obtenerPorDiaSemana(int $diaSemana): ?HorarioAtencion
  {
    $sql = "SELECT id, dia_semana, hora_inicio, hora_fin, activo 
            FROM horarios_atencion 
            WHERE dia_semana = ? AND activo = 1 
            LIMIT 1";

    $row = $this->db->fetchOne($sql, [$diaSemana]);
    return $row ? HorarioAtencion::fromArray($row) : null;
  }

  /**
   * Obtiene los bloqueos de agenda en un rango de fechas (festivos, descansos, etc.).
   *
   * @return BloqueoAgenda[]
   */
  public function obtenerBloqueosEnRango(string $fechaInicio, string $fechaFin): array
  {
    $sql = "SELECT id, fecha, hora_inicio, hora_fin, motivo 
            FROM bloqueos_agenda 
            WHERE fecha BETWEEN ? AND ? 
            ORDER BY fecha ASC, hora_inicio ASC";

    $rows = $this->db->fetchAll($sql, [$fechaInicio, $fechaFin]);
    return array_map(fn($r) => BloqueoAgenda::fromArray($r), $rows);
  }

  /**
   * Registra un nuevo bloqueo en la agenda.
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
   * Elimina un bloqueo por su ID.
   */
  public function eliminarBloqueo(int $id): bool
  {
    $sql = "DELETE FROM bloqueos_agenda WHERE id = ?";
    return $this->db->execute($sql, [$id]) > 0;
  }
}
