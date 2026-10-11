<?php

/**
 * Router para el servidor embebido de PHP (php -S) en desarrollo local.
 * Emula las cabeceras de producción (.htaccess) para control de caché y ETag.
 *
 * Uso: php -S localhost:8000 -t public router.php
 */

$rawUri = urldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH));

// Normalizar rutas con prefijo de subdirectorio /casa-nei/ si se presentan en local
$uri = str_starts_with($rawUri, '/casa-nei/')
    ? substr($rawUri, strlen('/casa-nei'))
    : ($rawUri === '/casa-nei' ? '/' : $rawUri);

// Si la ruta inicia con /api, procesarla con el front controller de la API
if (str_starts_with($uri, '/api')) {
    require __DIR__ . '/public/api/index.php';
    return true;
}

// Si la ruta inicia con /descarga/, mostrar la vista de descarga (Pretty URL local)
if (str_starts_with($uri, '/descarga/')) {
    header("Cache-Control: no-cache, no-store, must-revalidate");
    header("Pragma: no-cache");
    header("Expires: 0");
    require __DIR__ . '/public/descarga.html';
    return true;
}

// Determinar el archivo físico en el directorio public/
$publicFile = __DIR__ . '/public' . $uri;

// Si la petición es hacia la raíz / o un directorio con index.html
if ($uri === '/' || is_dir($publicFile)) {
    if (is_dir($publicFile) && !str_ends_with($rawUri, '/')) {
        header("Location: {$rawUri}/", true, 301);
        return true;
    }

    $targetHtml = is_dir($publicFile) ? rtrim($publicFile, '/') . '/index.html' : __DIR__ . '/public/index.html';
    if (file_exists($targetHtml)) {
        header("Cache-Control: no-cache, no-store, must-revalidate");
        header("Pragma: no-cache");
        header("Expires: 0");
        header("Content-Type: text/html; charset=UTF-8");
        readfile($targetHtml);
        return true;
    }
}

// Si el archivo solicitado existe físicamente dentro de public/
if (file_exists($publicFile) && !is_dir($publicFile)) {
    $extension = strtolower(pathinfo($publicFile, PATHINFO_EXTENSION));

    // Archivos HTML estáticos directos
    if (in_array($extension, ['html', 'htm'])) {
        header("Cache-Control: no-cache, no-store, must-revalidate");
        header("Pragma: no-cache");
        header("Expires: 0");
        header("Content-Type: text/html; charset=UTF-8");
        readfile($publicFile);
        return true;
    }

    // Archivos CSS y JavaScript: Control de caché y soporte ETag
    if (in_array($extension, ['css', 'js', 'mjs'])) {
        $mtime = filemtime($publicFile);
        $size = filesize($publicFile);
        $etag = sprintf('"%x-%x"', $mtime, $size);

        header("Cache-Control: no-cache, must-revalidate");
        header("ETag: $etag");

        // Responder 304 Not Modified si el navegador ya posee esta versión exacta
        if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && trim($_SERVER['HTTP_IF_NONE_MATCH']) === $etag) {
            http_response_code(304);
            return true;
        }

        $contentType = $extension === 'css'
            ? 'text/css; charset=UTF-8'
            : 'application/javascript; charset=UTF-8';
        header("Content-Type: {$contentType}");
        readfile($publicFile);
        return true;
    }

    // Para imágenes, fuentes, pdfs y demás activos, delegar al servidor nativo
    return false;
}

return false;

