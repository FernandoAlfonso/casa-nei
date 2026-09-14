<?php

namespace App\Agenda\Entities;

/**
 * Cliente - Entidad del dominio que representa a un cliente o paciente del sistema de agenda.
 *
 * Encapsula la identidad, el nombre completo y los campos de seguridad para el número telefónico
 * (almacenado cifrado con AES-256 junto con su hash determinista SHA-256 para búsquedas indexadas).
 *
 * @package App\Agenda\Entities
 */
class Cliente
{
  /**
   * Constructor de la entidad Cliente.
   *
   * @param int|null $id Identificador único del cliente (null si es nueva entidad).
   * @param string $nombreCompleto Nombre completo del paciente o cliente.
   * @param string|null $telefonoEncriptado Cadena binaria del teléfono cifrado con AES-256 (o null si se agendó sin cel).
   * @param string|null $telefonoHash Hash SHA-256 determinista para indexación y búsqueda rápida (o null).
   * @param string|null $createdAt Fecha y hora de creación en base de datos.
   * @param string|null $updatedAt Fecha y hora de última modificación.
   */
  public function __construct(
    private ?int $id = null,
    private string $nombreCompleto = '',
    private ?string $telefonoEncriptado = null,
    private ?string $telefonoHash = null,
    private ?string $createdAt = null,
    private ?string $updatedAt = null
  ) {
  }

  /**
   * Obtiene el identificador único del cliente.
   *
   * @return int|null
   */
  public function getId(): ?int
  {
    return $this->id;
  }

  /**
   * Establece el identificador único del cliente.
   *
   * @param int|null $id
   * @return self
   */
  public function setId(?int $id): self
  {
    $this->id = $id;
    return $this;
  }

  /**
   * Obtiene el nombre completo del cliente.
   *
   * @return string
   */
  public function getNombreCompleto(): string
  {
    return $this->nombreCompleto;
  }

  /**
   * Establece el nombre completo del cliente.
   *
   * @param string $nombreCompleto
   * @return self
   */
  public function setNombreCompleto(string $nombreCompleto): self
  {
    $this->nombreCompleto = trim($nombreCompleto);
    return $this;
  }

  /**
   * Obtiene el contenido binario del teléfono cifrado con AES-256.
   *
   * @return string|null
   */
  public function getTelefonoEncriptado(): ?string
  {
    return $this->telefonoEncriptado;
  }

  /**
   * Establece los bytes del teléfono cifrado.
   *
   * @param string|null $telefonoEncriptado
   * @return self
   */
  public function setTelefonoEncriptado(?string $telefonoEncriptado): self
  {
    $this->telefonoEncriptado = $telefonoEncriptado;
    return $this;
  }

  /**
   * Obtiene el hash SHA-256 determinista del teléfono para blind index.
   *
   * @return string|null
   */
  public function getTelefonoHash(): ?string
  {
    return $this->telefonoHash;
  }

  /**
   * Establece el hash determinista del teléfono.
   *
   * @param string|null $telefonoHash
   * @return self
   */
  public function setTelefonoHash(?string $telefonoHash): self
  {
    $this->telefonoHash = $telefonoHash;
    return $this;
  }

  /**
   * Obtiene la marca temporal de creación del registro.
   *
   * @return string|null
   */
  public function getCreatedAt(): ?string
  {
    return $this->createdAt;
  }

  /**
   * Establece la marca temporal de creación.
   *
   * @param string|null $createdAt
   * @return self
   */
  public function setCreatedAt(?string $createdAt): self
  {
    $this->createdAt = $createdAt;
    return $this;
  }

  /**
   * Obtiene la marca temporal de la última actualización.
   *
   * @return string|null
   */
  public function getUpdatedAt(): ?string
  {
    return $this->updatedAt;
  }

  /**
   * Establece la marca temporal de última actualización.
   *
   * @param string|null $updatedAt
   * @return self
   */
  public function setUpdatedAt(?string $updatedAt): self
  {
    $this->updatedAt = $updatedAt;
    return $this;
  }

  /**
   * Determina si el cliente tiene un teléfono registrado.
   *
   * @return bool
   */
  public function tieneTelefono(): bool
  {
    return !empty($this->telefonoEncriptado);
  }

  /**
   * Instancia una entidad Cliente a partir de un arreglo asociativo proveniente de base de datos.
   *
   * @param array<string, mixed> $data Arreglo con campos id, nombre_completo, telefono_encriptado, etc.
   * @return self
   */
  public static function fromArray(array $data): self
  {
    return new self(
      id: isset($data['id']) ? (int) $data['id'] : null,
      nombreCompleto: (string) ($data['nombre_completo'] ?? ''),
      telefonoEncriptado: $data['telefono_encriptado'] ?? null,
      telefonoHash: $data['telefono_hash'] ?? null,
      createdAt: $data['created_at'] ?? null,
      updatedAt: $data['updated_at'] ?? null
    );
  }

  /**
   * Convierte la entidad a un arreglo asociativo para operaciones de persistencia o serialización.
   *
   * @return array<string, mixed>
   */
  public function toArray(): array
  {
    return [
      'id' => $this->id,
      'nombre_completo' => $this->nombreCompleto,
      'telefono_encriptado' => $this->telefonoEncriptado,
      'telefono_hash' => $this->telefonoHash,
      'created_at' => $this->createdAt,
      'updated_at' => $this->updatedAt,
    ];
  }
}

