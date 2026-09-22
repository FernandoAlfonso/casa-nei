<?php
/**
 * Bootstrap para pruebas
 * Carga el autoloader y configura el entorno para testing (IS_LOCAL=true, sin headers).
 */

// Simular entorno CLI
if (php_sapi_name() !== 'cli') {
    die("Las pruebas solo deben ejecutarse desde la línea de comandos (CLI).\n");
}

// Configurar variables de entorno antes de cargar config
define('IS_LOCAL', true);
define('TESTING_MODE', true);

// Cargar la configuración principal del proyecto
$configPath = dirname(__DIR__) . '/src/config.php';
if (file_exists($configPath)) {
    require_once $configPath;
} else {
    die("No se encontró el archivo de configuración: {$configPath}\n");
}

// Cargar autoloader PSR-4 del proyecto
$autoloadPath = dirname(__DIR__) . '/src/Shared/autoload.php';
if (file_exists($autoloadPath)) {
    require_once $autoloadPath;
} else {
    die("No se encontró el autoloader: {$autoloadPath}\n");
}

// Configurar zona horaria de prueba
date_default_timezone_set('America/Mexico_City');

echo "Bootstrap de pruebas cargado correctamente.\n";
