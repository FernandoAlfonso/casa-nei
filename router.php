<?php

/**
 * Router para el servidor embebido de PHP (php -S) en desarrollo local.
 * Uso: php -S localhost:8000 -t public router.php
 */

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH));

// Si el archivo solicitado existe físicamente dentro de public/ (CSS, JS, imágenes, HTML, etc.)
$publicFile = __DIR__ . '/public' . $uri;
if ($uri !== '/' && file_exists($publicFile) && !is_dir($publicFile)) {
    return false; // PHP sirve el archivo estático directamente
}

// Si es un directorio dentro de public/ con su propio index.html (ej. /pwa-test/)
if (is_dir($publicFile) && file_exists($publicFile . '/index.html')) {
    if (!str_ends_with($uri, '/')) {
        header("Location: {$uri}/", true, 301);
        return true;
    }
    return false;
}

// Si la ruta inicia con /api, procesarla con el front controller de la API
if (str_starts_with($uri, '/api')) {
    require __DIR__ . '/public/api/index.php';
    return true;
}

// Si es la raíz / o cualquier otra página estática por defecto
if ($uri === '/' && file_exists(__DIR__ . '/public/index.html')) {
    return false;
}

return false;
