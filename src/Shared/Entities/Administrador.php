<?php

namespace App\Shared\Entities;

/**
 * Administrador - Entidad compartida que representa al usuario administrativo del sistema.
 */
class Administrador
{
  public function __construct(
    private ?int $id = null,
    private string $nombre = '',
    private string $email = '',
    private string $passwordHash = '',
    private bool $activo = true,
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

  public function getNombre(): string
  {
    return $this->nombre;
  }

  public function setNombre(string $nombre): self
  {
    $this->nombre = trim($nombre);
    return $this;
  }

  public function getEmail(): string
  {
    return $this->email;
  }

  public function setEmail(string $email): self
  {
    $this->email = trim($email);
    return $this;
  }

  public function getPasswordHash(): string
  {
    return $this->passwordHash;
  }

  public function setPasswordHash(string $passwordHash): self
  {
    $this->passwordHash = $passwordHash;
    return $this;
  }

  public function isActivo(): bool
  {
    return $this->activo;
  }

  public function setActivo(bool $activo): self
  {
    $this->activo = $activo;
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
      nombre: $data['nombre'] ?? '',
      email: $data['email'] ?? '',
      passwordHash: $data['password_hash'] ?? '',
      activo: isset($data['activo']) ? (bool) $data['activo'] : true,
      createdAt: $data['created_at'] ?? null,
      updatedAt: $data['updated_at'] ?? null
    );
  }

  /**
   * Convierte la entidad a un arreglo asociativo.
   */
  public function toArray(): array
  {
    return [
      'id' => $this->id,
      'nombre' => $this->nombre,
      'email' => $this->email,
      'password_hash' => $this->passwordHash,
      'activo' => $this->activo ? 1 : 0,
      'created_at' => $this->createdAt,
      'updated_at' => $this->updatedAt,
    ];
  }
}
