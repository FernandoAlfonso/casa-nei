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
   * Obtiene todos los servicios activos disponibles para agendar citas (Entidades de Dominio).
   *
   * @return Servicio[] Lista de entidades de servicios activos.
   */
  public function obtenerActivos(): array
  {
    $sql = "SELECT id, nombre, descripcion, instrucciones, duracion_minutos, precio, activo, created_at 
            FROM servicios 
            WHERE activo = 1 
            ORDER BY id ASC";

    return $this->db->fetchAll($sql, [], fn(array $r) => Servicio::fromArray($r));
  }

  /**
   * Obtiene la proyección directa del catálogo de servicios activos para la API (CQRS Read Model).
   * Evita la instanciación de objetos de entidad para serialización directa a JSON.
   *
   * @return array<int, array<string, mixed>>
   */
  public function obtenerCatalogoArray(): array
  {
    $sql = "SELECT id, nombre, descripcion, instrucciones, duracion_minutos, precio, activo, created_at 
            FROM servicios 
            WHERE activo = 1 
            ORDER BY id ASC";

    return $this->db->fetchAll($sql, [], function (array $r): array {
      return [
        'id' => (int) $r['id'],
        'nombre' => $r['nombre'],
        'descripcion' => $r['descripcion'] ?? null,
        'instrucciones' => $r['instrucciones'] ?? null,
        'duracion_minutos' => (int) ($r['duracion_minutos'] ?? 60),
        'precio' => isset($r['precio']) ? (float) $r['precio'] : null,
        'activo' => (int) ($r['activo'] ?? 1),
        'created_at' => $r['created_at'] ?? null,
      ];
    });
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

    return $this->db->fetchOne($sql, [$id], fn(array $row) => Servicio::fromArray($row));
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
