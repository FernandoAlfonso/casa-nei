<?php

namespace App\Agenda\Entities;

/**
 * Cliente - Entidad pura que representa a un cliente/paciente del sistema de agenda.
 */
class Cliente
{
  public function __construct(
    private ?int $id = null,
    private string $nombreCompleto = '',
    private ?string $telefonoEncriptado = null,
    private ?string $telefonoHash = null,
    private ?string $createdAt = null,
    private ?string $updatedAt = null
  ) {
  }

  // Getters y Setters
  public function getId(): ?int
  {
    return $this->id;
  }

  public function setId(?int $id): self
  {
    $this->id = $id;
    return $this;
  }

  public function getNombreCompleto(): string
  {
    return $this->nombreCompleto;
  }

  public function setNombreCompleto(string $nombreCompleto): self
  {
    $this->nombreCompleto = trim($nombreCompleto);
    return $this;
  }

  public function getTelefonoEncriptado(): ?string
  {
    return $this->telefonoEncriptado;
  }

  public function setTelefonoEncriptado(?string $telefonoEncriptado): self
  {
    $this->telefonoEncriptado = $telefonoEncriptado;
    return $this;
  }

  public function getTelefonoHash(): ?string
  {
    return $this->telefonoHash;
  }

  public function setTelefonoHash(?string $telefonoHash): self
  {
    $this->telefonoHash = $telefonoHash;
    return $this;
  }

  public function getCreatedAt(): ?string
  {
    return $this->createdAt;
  }

  public function setCreatedAt(?string $createdAt): self
  {
    $this->createdAt = $createdAt;
    return $this;
  }

  public function getUpdatedAt(): ?string
  {
    return $this->updatedAt;
  }

  public function setUpdatedAt(?string $updatedAt): self
  {
    $this->updatedAt = $updatedAt;
    return $this;
  }

  /**
   * Instancia la entidad desde un arreglo asociativo.
   */
  public static function fromArray(array $data): self
  {
    return new self(
      id: isset($data['id']) ? (int) $data['id'] : null,
      nombreCompleto: $data['nombre_completo'] ?? '',
      telefonoEncriptado: $data['telefono_encriptado'] ?? null,
      telefonoHash: $data['telefono_hash'] ?? null,
      createdAt: $data['created_at'] ?? null,
      updatedAt: $data['updated_at'] ?? null
    );
  }

  /**
   * Convierte la entidad a un arreglo asociativo para persistencia.
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
