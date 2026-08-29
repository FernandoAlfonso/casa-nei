<?php

namespace App\Shared\Http;

/**
 * Response - Objeto para estructurar y emitir respuestas HTTP y JSON.
 */
class Response
{
  /**
   * Emite una respuesta JSON con el código de estado adecuado.
   */
  public static function json(mixed $data, int $statusCode = 200): void
  {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');

    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
  }

  /**
   * Emite una respuesta JSON de éxito estandarizada.
   */
  public static function success(mixed $data = null, string $message = 'Operación exitosa', int $statusCode = 200): void
  {
    self::json([
      'success' => true,
      'message' => $message,
      'data'    => $data
    ], $statusCode);
  }

  /**
   * Emite una respuesta JSON de error estandarizada.
   */
  public static function error(string $message = 'Error en la petición', int $statusCode = 400, array $errors = []): void
  {
    self::json([
      'success' => false,
      'error'   => $message,
      'errors'  => $errors
    ], $statusCode);
  }
}
