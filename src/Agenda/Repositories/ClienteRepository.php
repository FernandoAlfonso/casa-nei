<?php

namespace App\Agenda\Repositories;

use App\Agenda\Entities\Cliente;
use App\Shared\Db\DataBase;
use App\Shared\Security\Encryption;
use Exception;

/**
 * ClienteRepository - Repositorio de persistencia y consultas para clientes/pacientes.
 */
class ClienteRepository
{
  private DataBase $db;
  private Encryption $crypto;

  public function __construct(?DataBase $db = null, ?Encryption $crypto = null)
  {
    $this->db = $db ?? DataBase::getInstance();
    $this->crypto = $crypto ?? new Encryption();
  }

  /**
   * Busca un cliente por su número de teléfono mediante su hash SHA-256.
   * Si existe, precarga los datos y descifra el número.
   */
  public function buscarPorTelefono(string $telefono): ?Cliente
  {
    $hash = $this->crypto->hash($telefono);
    $sql = "SELECT id, nombre_completo, telefono_encriptado, telefono_hash, created_at, updated_at 
            FROM clientes 
            WHERE telefono_hash = ? 
            LIMIT 1";

    $row = $this->db->fetchOne($sql, [$hash]);
    if (!$row) {
      return null;
    }

    return Cliente::fromArray($row);
  }

  /**
   * Busca un cliente por su ID.
   */
  public function buscarPorId(int $id): ?Cliente
  {
    $sql = "SELECT id, nombre_completo, telefono_encriptado, telefono_hash, created_at, updated_at 
            FROM clientes 
            WHERE id = ? 
            LIMIT 1";

    $row = $this->db->fetchOne($sql, [$id]);
    if (!$row) {
      return null;
    }

    return Cliente::fromArray($row);
  }

  /**
   * Registra un nuevo cliente cifrando su número de teléfono.
   *
   * @throws Exception Si ocurre un error al cifrar o al insertar
   */
  public function registrar(string $nombreCompleto, string $telefono): Cliente
  {
    $encrypted = $this->crypto->encrypt($telefono);
    $hash = $this->crypto->hash($telefono);

    $sql = "INSERT INTO clientes (nombre_completo, telefono_encriptado, telefono_hash) 
            VALUES (?, ?, ?)";

    $this->db->execute($sql, [$nombreCompleto, $encrypted, $hash]);
    $nuevoId = (int) $this->db->lastInsertId();

    return new Cliente(
      id: $nuevoId,
      nombreCompleto: $nombreCompleto,
      telefonoEncriptado: $encrypted,
      telefonoHash: $hash
    );
  }

  /**
   * Actualiza el nombre o teléfono de un cliente existente.
   */
  public function actualizar(int $id, string $nombreCompleto, ?string $nuevoTelefono = null): bool
  {
    if ($nuevoTelefono !== null && trim($nuevoTelefono) !== '') {
      $encrypted = $this->crypto->encrypt($nuevoTelefono);
      $hash = $this->crypto->hash($nuevoTelefono);

      $sql = "UPDATE clientes 
              SET nombre_completo = ?, telefono_encriptado = ?, telefono_hash = ? 
              WHERE id = ?";

      return $this->db->execute($sql, [$nombreCompleto, $encrypted, $hash, $id]) > 0;
    }

    $sql = "UPDATE clientes SET nombre_completo = ? WHERE id = ?";
    return $this->db->execute($sql, [$nombreCompleto, $id]) > 0;
  }

  /**
   * Obtiene el número en claro descifrando el campo encriptado.
   */
  public function descifrarTelefono(Cliente $cliente): ?string
  {
    return $this->crypto->decrypt($cliente->getTelefonoEncriptado());
  }
}
