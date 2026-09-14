<?php

namespace App\Agenda\Repositories;

use App\Agenda\Entities\Servicio;
use App\Shared\Db\DataBase;

/**
 * Class ServicioRepository
 *
 * Repositorio para la consulta, catálogo y administración de servicios y terapias en Casa Nei.
 *
 * @package App\Agenda\Repositories
 */
class ServicioRepository
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
   * Obtiene todos los servicios activos disponibles para agendar citas.
   *
   * @return Servicio[] Lista de entidades de servicios activos.
   */
  public function obtenerActivos(): array
  {
    $sql = "SELECT id, nombre, descripcion, instrucciones, duracion_minutos, precio, activo, created_at 
            FROM servicios 
            WHERE activo = 1 
            ORDER BY id ASC";

    $rows = $this->db->fetchAll($sql);
    return array_map(fn($r) => Servicio::fromArray($r), $rows);
  }

  /**
   * Busca un servicio por su identificador primario.
   *
   * @param int $id ID del servicio.
   * @return Servicio|null Entidad Servicio encontrada o null.
   */
  public function buscarPorId(int $id): ?Servicio
  {
    $sql = "SELECT id, nombre, descripcion, instrucciones, duracion_minutos, precio, activo, created_at 
            FROM servicios 
            WHERE id = ? 
            LIMIT 1";

    $row = $this->db->fetchOne($sql, [$id]);
    return $row ? Servicio::fromArray($row) : null;
  }

  /**
   * Crea y persiste un nuevo servicio en la base de datos.
   *
   * @param Servicio $servicio Entidad con los datos del servicio a registrar.
   * @return int ID del servicio recién creado.
   */
  public function crear(Servicio $servicio): int
  {
    $sql = "INSERT INTO servicios (nombre, descripcion, instrucciones, duracion_minutos, precio, activo) 
            VALUES (?, ?, ?, ?, ?, ?)";

    $this->db->execute($sql, [
      $servicio->getNombre(),
      $servicio->getDescripcion(),
      $servicio->getInstrucciones(),
      $servicio->getDuracionMinutos(),
      $servicio->getPrecio(),
      $servicio->isActivo() ? 1 : 0
    ]);

    $id = (int) $this->db->lastInsertId();
    $servicio->setId($id);
    return $id;
  }

  /**
   * Actualiza los datos de un servicio existente.
   *
   * @param Servicio $servicio Entidad Servicio con datos modificados.
   * @return bool True si se actualizó al menos una fila.
   */
  public function actualizar(Servicio $servicio): bool
  {
    $sql = "UPDATE servicios 
            SET nombre = ?, descripcion = ?, instrucciones = ?, duracion_minutos = ?, precio = ?, activo = ? 
            WHERE id = ?";

    return $this->db->execute($sql, [
      $servicio->getNombre(),
      $servicio->getDescripcion(),
      $servicio->getInstrucciones(),
      $servicio->getDuracionMinutos(),
      $servicio->getPrecio(),
      $servicio->isActivo() ? 1 : 0,
      $servicio->getId()
    ]) > 0;
  }
}
