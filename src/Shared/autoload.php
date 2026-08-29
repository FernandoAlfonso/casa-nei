<?php

/**
 * Autoloader PSR-4 para el namespace App\
 */
spl_autoload_register(function (string $class) {
  $prefix = 'App\\';
  $baseDir = dirname(__DIR__) . '/';

  $len = strlen($prefix);
  if (strncmp($prefix, $class, $len) !== 0) {
    return;
  }

  $relativeClass = substr($class, $len);
  $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';

  if (file_exists($file)) {
    require_once $file;
  }
});

// Cargar configuración global si existe
$configPath = dirname(__DIR__) . '/config.php';
if (file_exists($configPath)) {
  require_once $configPath;
}
