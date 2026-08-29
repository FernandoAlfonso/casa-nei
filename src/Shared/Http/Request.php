<?php

namespace App\Shared\Http;

/**
 * Request - Objeto para abstraer la petición HTTP entrante.
 */
class Request
{
  private string $method;
  private string $path;
  private array $query;
  private array $body;

  public function __construct()
  {
    $this->method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    $this->query = $_GET;

    // Detectar ruta (soporta PATH_INFO, REQUEST_URI o parámetro route)
    $path = $_SERVER['PATH_INFO'] ?? ($_GET['route'] ?? parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH));
    // Limpiar prefijo /api si viene en la URL
    $path = preg_replace('#^.*/api#', '', $path);
    $this->path = '/' . trim($path, '/');

    // Parsear cuerpo JSON o FormData
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (str_contains($contentType, 'application/json')) {
      $input = file_get_contents('php://input');
      $this->body = json_decode($input, true) ?? [];
    } else {
      $this->body = $_POST;
    }
  }

  public function getMethod(): string
  {
    return $this->method;
  }

  public function getPath(): string
  {
    return $this->path;
  }

  public function getQuery(?string $key = null, mixed $default = null): mixed
  {
    if ($key === null) {
      return $this->query;
    }
    return $this->query[$key] ?? $default;
  }

  public function getBody(?string $key = null, mixed $default = null): mixed
  {
    if ($key === null) {
      return $this->body;
    }
    return $this->body[$key] ?? $default;
  }

  public function get(string $key, mixed $default = null): mixed
  {
    return $this->getBody($key, $this->getQuery($key, $default));
  }
}
