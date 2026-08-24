<?php

namespace App\Agenda\Repositories;

use App\Agenda\Entities\Servicio;
use App\Shared\Db\DataBase;

/**
 * ServicioRepository - Repositorio para la consulta y administración de servicios disponibles.
 */
class ServicioRepository
{
  private DataBase $db;

  public function __construct(?DataBase $db = null)
  {
    $this->db = $db ?? DataBase::getInstance();
  }

  /**
   * Obtiene todos los servicios activos disponibles para agendar.
   *
   * @return Servicio[]
   */
  public function obtenerActivos(): array
  {
    $sql = "SELECT id, nombre, descripcion, duracion_minutos, precio, activo, created_at 
            FROM servicios 
            WHERE activo = 1 
            ORDER BY id ASC";

    $rows = $this->db->fetchAll($sql);
    return array_map(fn($r) => Servicio::fromArray($r), $rows);
  }

  /**
   * Busca un servicio por su ID.
   */
  public function buscarPorId(int $id): ?Servicio
  {
    $sql = "SELECT id, nombre, descripcion, duracion_minutos, precio, activo, created_at 
            FROM servicios 
            WHERE id = ? 
            LIMIT 1";

    $row = $this->db->fetchOne($sql, [$id]);
    return $row ? Servicio::fromArray($row) : null;
  }

  /**
   * Crea un nuevo servicio en la base de datos.
   */
  public function crear(Servicio $servicio): int
  {
    $sql = "INSERT INTO servicios (nombre, descripcion, duracion_minutos, precio, activo) 
            VALUES (?, ?, ?, ?, ?)";

    $this->db->execute($sql, [
      $servicio->getNombre(),
      $servicio->getDescripcion(),
      $servicio->getDuracionMinutos(),
      $servicio->getPrecio(),
      $servicio->isActivo() ? 1 : 0
    ]);

    $id = (int) $this->db->lastInsertId();
    $servicio->setId($id);
    return $id;
  }

  /**
   * Actualiza los datos de un servicio.
   */
  public function actualizar(Servicio $servicio): bool
  {
    $sql = "UPDATE servicios 
            SET nombre = ?, descripcion = ?, duracion_minutos = ?, precio = ?, activo = ? 
            WHERE id = ?";

    return $this->db->execute($sql, [
      $servicio->getNombre(),
      $servicio->getDescripcion(),
      $servicio->getDuracionMinutos(),
      $servicio->getPrecio(),
      $servicio->isActivo() ? 1 : 0,
      $servicio->getId()
    ]) > 0;
  }
}
