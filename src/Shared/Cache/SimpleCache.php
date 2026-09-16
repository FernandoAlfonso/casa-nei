<?php

namespace App\Shared\Cache;

use Throwable;

/**
 * Class SimpleCache
 *
 * Sistema de caché ligero y de alto rendimiento de dos niveles:
 * 1. Nivel L1 (Memoria de proceso): Reutilización instantánea durante el ciclo de vida del script (0.00 ms).
 * 2. Nivel L2 (Archivo persistente con TTL): Persistencia entre peticiones HTTP sucesivas para datos estáticos
 *    (catálogos, horarios de atención) evitando consultas remotas innecesarias a la base de datos.
 *
 * Cuenta con degradación elegante si el almacenamiento en disco no está disponible.
 *
 * @package App\Shared\Cache
 */
class SimpleCache
{
  /**
   * Almacén en memoria volátil de nivel 1.
   *
   * @var array<string, mixed>
   */
  private static array $memoryCache = [];

  /**
   * Directorio de almacenamiento en disco para el nivel 2.
   */
  private static ?string $storageDir = null;

  /**
   * Obtiene la ruta al directorio de almacenamiento, creándolo si no existe.
   *
   * @return string
   */
  private static function getStorageDir(): string
  {
    if (self::$storageDir === null) {
      self::$storageDir = __DIR__ . '/storage';
      if (!is_dir(self::$storageDir)) {
        @mkdir(self::$storageDir, 0755, true);
      }
    }
    return self::$storageDir;
  }

  /**
   * Obtiene la ruta física del archivo de caché para una clave determinada.
   *
   * @param string $key Clave alfanumérica identificadora.
   * @return string
   */
  private static function getFilePath(string $key): string
  {
    $safeKey = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $key);
    return self::getStorageDir() . '/' . $safeKey . '.cache.json';
  }

  /**
   * Recupera un elemento de la caché si existe y no ha expirado.
   *
   * @param string $key Clave del elemento.
   * @param mixed $default Valor por defecto en caso de no encontrarse o estar expirado.
   * @return mixed
   */
  public static function get(string $key, mixed $default = null): mixed
  {
    // 1. Comprobar memoria L1
    if (array_key_exists($key, self::$memoryCache)) {
      return self::$memoryCache[$key];
    }

    // 2. Comprobar archivo L2
    $filePath = self::getFilePath($key);
    if (!file_exists($filePath)) {
      return $default;
    }

    try {
      $raw = @file_get_contents($filePath);
      if ($raw === false) {
        return $default;
      }

      $payload = json_decode($raw, true);
      if (!is_array($payload) || !isset($payload['expires_at'])) {
        @unlink($filePath);
        return $default;
      }

      // Validar expiración (TTL)
      if ($payload['expires_at'] !== 0 && time() > $payload['expires_at']) {
        @unlink($filePath);
        return $default;
      }

      $val = $payload['data'] ?? $default;
      self::$memoryCache[$key] = $val;
      return $val;
    } catch (Throwable) {
      return $default;
    }
  }

  /**
   * Almacena un elemento en la caché por un tiempo determinado (TTL en segundos).
   *
   * @param string $key Clave única.
   * @param mixed $value Valor a almacenar (serializable en JSON).
   * @param int $ttl Tiempo de vida en segundos (0 para infinito, por defecto 3600 = 1 hora).
   * @return bool True si se guardó con éxito.
   */
  public static function set(string $key, mixed $value, int $ttl = 3600): bool
  {
    self::$memoryCache[$key] = $value;

    try {
      $filePath = self::getFilePath($key);
      $payload = [
        'created_at' => time(),
        'expires_at' => $ttl > 0 ? (time() + $ttl) : 0,
        'data' => $value
      ];

      return (bool) @file_put_contents($filePath, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    } catch (Throwable) {
      return false;
    }
  }

  /**
   * Obtiene un valor de la caché, o ejecuta el callback dado, guarda el resultado y lo retorna.
   *
   * @template T
   * @param string $key Clave única.
   * @param int $ttl Tiempo de vida en segundos.
   * @param callable(): T $callback Función que genera el valor si no existe en caché.
   * @return T
   */
  public static function remember(string $key, int $ttl, callable $callback): mixed
  {
    $cached = self::get($key);
    if ($cached !== null) {
      return $cached;
    }

    $value = $callback();
    self::set($key, $value, $ttl);
    return $value;
  }

  /**
   * Elimina un elemento específico de la caché en memoria y disco.
   *
   * @param string $key
   * @return bool
   */
  public static function forget(string $key): bool
  {
    unset(self::$memoryCache[$key]);

    $filePath = self::getFilePath($key);
    if (file_exists($filePath)) {
      return @unlink($filePath);
    }

    return true;
  }

  /**
   * Limpia todos los elementos almacenados en la caché.
   *
   * @return bool
   */
  public static function flush(): bool
  {
    self::$memoryCache = [];

    $dir = self::getStorageDir();
    if (!is_dir($dir)) {
      return true;
    }

    $files = glob($dir . '/*.cache.json') ?: [];
    foreach ($files as $file) {
      @unlink($file);
    }

    return true;
  }
}
