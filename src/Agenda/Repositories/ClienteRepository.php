<?php

namespace App\Agenda\Repositories;

use App\Agenda\Entities\Cliente;
use App\Shared\Db\DataBase;
use App\Shared\Security\Encryption;
use Exception;

/**
 * ClienteRepository - Repositorio de persistencia y consultas para clientes y pacientes.
 *
 * Administra el almacenamiento seguro de pacientes, cifrando los números de teléfono con AES-256
 * y generando un Blind Index SHA-256 determinista para posibilitar búsquedas exactas e instantáneas.
 * Soporta clientes con teléfono opcional para registros directos de administración.
 *
 * @package App\Agenda\Repositories
 */
class ClienteRepository
{
  /**
   * Instancia de la base de datos (PDO Wrapper).
   */
  private DataBase $db;

  /**
   * Servicio de cifrado y hashing determinista.
   */
  private Encryption $crypto;

  /**
   * Constructor del repositorio.
   *
   * @param DataBase|null $db Conexión a base de datos (inyección o Singleton).
   * @param Encryption|null $crypto Servicio criptográfico (inyección o instancia).
   */
  public function __construct(?DataBase $db = null, ?Encryption $crypto = null)
  {
    $this->db = $db ?? DataBase::getInstance();
    $this->crypto = $crypto ?? new Encryption();
  }

  /**
   * Busca un cliente por su número de teléfono mediante su hash SHA-256 (Blind Index).
   *
   * @param string|null $telefono Número telefónico en cualquier formato común (+52, espacios, guiones).
   * @return Cliente|null Entidad Cliente encontrada o null si no existe o el teléfono está vacío.
   */
  public function buscarPorTelefono(?string $telefono): ?Cliente
  {
    if ($telefono === null || trim($telefono) === '') {
      return null;
    }

    $hash = $this->crypto->hash($telefono);
    $sql = "SELECT id, nombre_completo, telefono_encriptado, telefono_hash, created_at, updated_at 
            FROM clientes 
            WHERE telefono_hash = ? 
            LIMIT 1";

    return $this->db->fetchOne($sql, [$hash], fn(array $row) => Cliente::fromArray($row));
  }

  /**
   * Obtiene todos los clientes registrados para el panel administrativo, descifrando el teléfono.
   *
   * @param int $limite Límite de resultados (opcional).
   * @return array
   */
  public function obtenerTodos(int $limite = 100): array
  {
    $sql = "SELECT id, nombre_completo, telefono_encriptado, created_at, updated_at 
            FROM clientes 
            ORDER BY nombre_completo ASC
            LIMIT ?";
    
    return $this->db->fetchAll($sql, [$limite], function (array $row): array {
      $encryptedPhone = $row['telefono_encriptado'] ?? null;
      $row['telefono'] = (!empty($encryptedPhone)) ? $this->crypto->decrypt($encryptedPhone) : null;
      unset($row['telefono_encriptado']);
      return $row;
    });
  }

  /**
   * Busca un cliente por su identificador único primario.
   *
   * @param int $id Identificador del cliente.
   * @return Cliente|null Entidad Cliente o null si no se encuentra.
   */
  public function buscarPorId(int $id): ?Cliente
  {
    $sql = "SELECT id, nombre_completo, telefono_encriptado, telefono_hash, created_at, updated_at 
            FROM clientes 
            WHERE id = ? 
            LIMIT 1";

    return $this->db->fetchOne($sql, [$id], fn(array $row) => Cliente::fromArray($row));
  }

  /**
   * Registra un nuevo cliente en el sistema.
   *
   * Si se proporciona teléfono, lo normaliza, cifra con AES-256 y calcula su hash SHA-256.
   * Si no se proporciona teléfono (ej. agendado administrativo directo), persiste valores vacíos seguros.
   *
   * @param string $nombreCompleto Nombre y apellidos del paciente.
   * @param string|null $telefono Número telefónico del paciente (opcional).
   * @return Cliente Entidad recién registrada con su ID autoincremental asignado.
   * @throws Exception Si ocurre un fallo en el cifrado o en la inserción SQL.
   */
  public function registrar(string $nombreCompleto, ?string $telefono = null): Cliente
  {
    $nombreLimpio = trim($nombreCompleto);
    $tieneTelefono = ($telefono !== null && trim($telefono) !== '');

    $encrypted = $tieneTelefono ? $this->crypto->encrypt(trim($telefono)) : '';
    $hash = $tieneTelefono ? $this->crypto->hash(trim($telefono)) : '';

    $sql = "INSERT INTO clientes (nombre_completo, telefono_encriptado, telefono_hash) 
            VALUES (?, ?, ?)";

    $this->db->execute($sql, [$nombreLimpio, $encrypted, $hash]);
    $nuevoId = (int) $this->db->lastInsertId();

    return new Cliente(
      id: $nuevoId,
      nombreCompleto: $nombreLimpio,
      telefonoEncriptado: $tieneTelefono ? $encrypted : null,
      telefonoHash: $tieneTelefono ? $hash : null
    );
  }

  /**
   * Actualiza los datos de un cliente existente.
   *
   * @param int $id Identificador del cliente.
   * @param string $nombreCompleto Nuevo nombre del cliente.
   * @param string|null $nuevoTelefono Nuevo teléfono (si es provisto, se vuelve a cifrar).
   * @return bool True si se actualizó al menos una fila.
   * @throws Exception Si ocurre un fallo en la operación.
   */
  public function actualizar(int $id, string $nombreCompleto, ?string $nuevoTelefono = null): bool
  {
    $nombreLimpio = trim($nombreCompleto);

    if ($nuevoTelefono !== null && trim($nuevoTelefono) !== '') {
      $encrypted = $this->crypto->encrypt(trim($nuevoTelefono));
      $hash = $this->crypto->hash(trim($nuevoTelefono));

      $sql = "UPDATE clientes 
              SET nombre_completo = ?, telefono_encriptado = ?, telefono_hash = ? 
              WHERE id = ?";

      return $this->db->execute($sql, [$nombreLimpio, $encrypted, $hash, $id]) > 0;
    }

    $sql = "UPDATE clientes SET nombre_completo = ? WHERE id = ?";
    return $this->db->execute($sql, [$nombreLimpio, $id]) > 0;
  }

  /**
   * Obtiene el número telefónico en claro descifrando el payload AES-256 de la entidad.
   *
   * @param Cliente $cliente Entidad del cliente a descifrar.
   * @return string|null Número telefónico en texto plano o null si el cliente no registró celular.
   */
  public function descifrarTelefono(Cliente $cliente): ?string
  {
    $encrypted = $cliente->getTelefonoEncriptado();
    if ($encrypted === null || $encrypted === '') {
      return null;
    }

    return $this->crypto->decrypt($encrypted);
  }
}

