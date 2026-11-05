<?php

namespace App\Shared\Utils;

/**
 * Clase AssetVersioner
 *
 * Automatiza el control de versiones y cache busting de recursos estáticos (CSS y JS)
 * en archivos HTML. Calcula hashes de contenido y fechas de modificación para actualizar
 * los parámetros "?v=" únicamente cuando los archivos sufren cambios reales, garantizando
 * que los navegadores móviles reciban siempre el código fresco sin descargas innecesarias.
 *
 * @package App\Shared\Utils
 */
class AssetVersioner
{
    /**
     * Directorio raíz de archivos públicos.
     * @var string
     */
    private string $publicDir;

    /**
     * Prefijo de subdirectorio para entornos de producción (ej. /casa-nei/).
     * @var string
     */
    private string $basePrefix;

    /**
     * Constructor.
     *
     * @param string $publicDir Ruta absoluta al directorio public.
     * @param string $basePrefix Prefijo de subdirectorio en producción.
     */
    public function __construct(string $publicDir, string $basePrefix = '/casa-nei')
    {
        $this->publicDir = rtrim($publicDir, '/');
        $this->basePrefix = '/' . trim($basePrefix, '/');
    }

    /**
     * Procesa todos los archivos HTML dentro del directorio public.
     *
     * @param string|null $forcedVersion Versión estática forzada (opcional).
     * @param bool $dryRun Si es true, solo simula los cambios sin escribir a disco.
     * @return array Resumen detallado de los archivos procesados y cambios aplicados.
     */
    public function versionAllHtml(?string $forcedVersion = null, bool $dryRun = false): array
    {
        $htmlFiles = $this->findHtmlFiles($this->publicDir);
        $summary = [];

        foreach ($htmlFiles as $file) {
            $summary[] = $this->versionFile($file, $forcedVersion, $dryRun);
        }

        return $summary;
    }

    /**
     * Procesa un archivo HTML específico para actualizar sus recursos JS y CSS.
     *
     * @param string $htmlFilePath Ruta absoluta al archivo HTML.
     * @param string|null $forcedVersion Versión forzada (opcional).
     * @param bool $dryRun Si es true, no escribe cambios en el archivo.
     * @return array Detalles de los cambios en el archivo.
     */
    public function versionFile(string $htmlFilePath, ?string $forcedVersion = null, bool $dryRun = false): array
    {
        if (!file_exists($htmlFilePath)) {
            return [
                'file' => $htmlFilePath,
                'status' => 'not_found',
                'modified' => false,
                'assets' => []
            ];
        }

        $originalContent = file_get_contents($htmlFilePath);

        // Primero sincronizar recursivamente los imports internos de los módulos JS referenciados
        $this->versionHtmlModuleImports($originalContent, $htmlFilePath, $forcedVersion, $dryRun);

        $result = $this->processHtmlContent($originalContent, $htmlFilePath, $forcedVersion);

        if ($result['modified'] && !$dryRun) {
            file_put_contents($htmlFilePath, $result['content']);
        }

        return [
            'file' => $htmlFilePath,
            'relativePath' => str_replace($this->publicDir, '', $htmlFilePath),
            'modified' => $result['modified'],
            'assets' => $result['assets']
        ];
    }

    /**
     * Procesa el contenido HTML y reemplaza las etiquetas de assets.
     *
     * @param string $html Contenido HTML original.
     * @param string $htmlFilePath Ruta del archivo HTML para resolver rutas relativas.
     * @param string|null $forcedVersion Versión forzada opcional.
     * @return array ['content' => string, 'modified' => bool, 'assets' => array]
     */
    public function processHtmlContent(string $html, string $htmlFilePath, ?string $forcedVersion = null): array
    {
        $assetsTracked = [];
        $modified = false;

        // 1. Procesar etiquetas <link rel="stylesheet"> y <link rel="modulepreload">
        // Maneja formatos con rel antes o después de href
        $linkPattern = '/<link\b(?=[^>]*\srel=["\'](?:stylesheet|modulepreload)["\'])(?=[^>]*\shref=["\']([^"\']+)["\'])[^>]*>/i';
        $html = preg_replace_callback($linkPattern, function ($matches) use ($htmlFilePath, $forcedVersion, &$assetsTracked, &$modified) {
            $fullTag = $matches[0];
            $href = $matches[1];

            $replacement = $this->processAssetUrl($fullTag, 'href', $href, $htmlFilePath, $forcedVersion, $assetsTracked);
            if ($replacement !== $fullTag) {
                $modified = true;
            }
            return $replacement;
        }, $html);

        // 2. Procesar etiquetas <script src="...">
        $scriptPattern = '/<script\b(?=[^>]*\ssrc=["\']([^"\']+)["\'])[^>]*>/i';
        $html = preg_replace_callback($scriptPattern, function ($matches) use ($htmlFilePath, $forcedVersion, &$assetsTracked, &$modified) {
            $fullTag = $matches[0];
            $src = $matches[1];

            $replacement = $this->processAssetUrl($fullTag, 'src', $src, $htmlFilePath, $forcedVersion, $assetsTracked);
            if ($replacement !== $fullTag) {
                $modified = true;
            }
            return $replacement;
        }, $html);

        return [
            'content' => $html,
            'modified' => $modified,
            'assets' => $assetsTracked
        ];
    }

    /**
     * Calcula la versión única de un asset basada en fecha y hash de contenido.
     * Para módulos JavaScript, sigue recursivamente los imports para invalidar
     * el entry point si un submódulo dependiente cambia.
     *
     * @param string $assetDiskPath Ruta absoluta al archivo en disco.
     * @return string Cadena de versión (ej. '20261011-8f4b2a').
     */
    public function computeAssetVersion(string $assetDiskPath): string
    {
        if (!file_exists($assetDiskPath)) {
            return date('Ymd');
        }

        $visited = [];
        $maxMtime = filemtime($assetDiskPath);
        $combinedHashes = [];

        $this->collectAssetDependencies($assetDiskPath, $visited, $maxMtime, $combinedHashes);

        $datePart = date('Ymd', $maxMtime);
        $hashPart = substr(md5(implode('', $combinedHashes)), 0, 6);

        return "{$datePart}-{$hashPart}";
    }

    /**
     * Resuelve la ruta física en disco de un recurso referenciado en el HTML.
     *
     * @param string $url URL o ruta del recurso en la etiqueta HTML.
     * @param string $htmlFilePath Ruta del archivo HTML contenedor.
     * @return string|null Ruta absoluta en disco o null si es externo/inválido.
     */
    public function resolveAssetDiskPath(string $url, string $htmlFilePath): ?string
    {
        // Ignorar URLs absolutas externas y de protocolo
        if (preg_match('/^(https?:|\/\/|data:)/i', $url)) {
            return null;
        }

        // Extraer la ruta base sin parámetros de consulta
        $cleanPath = parse_url($url, PHP_URL_PATH) ?? $url;

        // Normalizar si incluye el prefijo de producción (/casa-nei/)
        if ($this->basePrefix !== '/' && str_starts_with($cleanPath, $this->basePrefix . '/')) {
            $cleanPath = substr($cleanPath, strlen($this->basePrefix));
        }

        // Si es ruta absoluta desde la raíz de la web
        if (str_starts_with($cleanPath, '/')) {
            $fullPath = $this->publicDir . $cleanPath;
        } else {
            // Es ruta relativa al archivo HTML
            $htmlDir = dirname($htmlFilePath);
            $fullPath = $htmlDir . '/' . $cleanPath;
        }

        $real = realpath($fullPath);
        return $real !== false ? $real : $fullPath;
    }

    /**
     * Procesa la URL de un asset dentro de un tag HTML.
     *
     * @param string $tag Etiqueta HTML completa.
     * @param string $attr Atributo ('href' o 'src').
     * @param string $url Valor actual del atributo.
     * @param string $htmlFilePath Ruta del archivo HTML.
     * @param string|null $forcedVersion Versión forzada opcional.
     * @param array $assetsTracked Referencia a la lista de assets rastreados.
     * @return string Etiqueta HTML actualizada.
     */
    private function processAssetUrl(
        string $tag,
        string $attr,
        string $url,
        string $htmlFilePath,
        ?string $forcedVersion,
        array &$assetsTracked
    ): string {
        $diskPath = $this->resolveAssetDiskPath($url, $htmlFilePath);

        // Si es externo o no existe en disco, se conserva sin modificar
        if ($diskPath === null || !file_exists($diskPath)) {
            return $tag;
        }

        // Obtener versión anterior si existía
        $parsedUrl = parse_url($url);
        $cleanPath = $parsedUrl['path'] ?? $url;
        $query = $parsedUrl['query'] ?? '';
        parse_str($query, $queryParams);
        $oldVersion = $queryParams['v'] ?? null;

        // Calcular nueva versión
        $newVersion = $forcedVersion !== null && trim($forcedVersion) !== ''
            ? trim($forcedVersion)
            : $this->computeAssetVersion($diskPath);

        $newUrl = $cleanPath . '?v=' . $newVersion;

        $hasChanged = ($oldVersion !== $newVersion);

        $assetsTracked[] = [
            'raw_url' => $url,
            'clean_path' => $cleanPath,
            'disk_path' => $diskPath,
            'old_version' => $oldVersion,
            'new_version' => $newVersion,
            'changed' => $hasChanged
        ];

        // Reemplazar únicamente el atributo en el tag
        $pattern = '/' . preg_quote($attr, '/') . '=["\']' . preg_quote($url, '/') . '["\']/';
        $replacement = sprintf('%s="%s"', $attr, $newUrl);

        return preg_replace($pattern, $replacement, $tag, 1) ?? $tag;
    }

    /**
     * Sincroniza recursivamente los parámetros ?v= en las declaraciones import de los scripts locales de un HTML.
     *
     * @param string $html Contenido HTML.
     * @param string $htmlFilePath Ruta del archivo HTML.
     * @param string|null $forcedVersion Versión forzada opcional.
     * @param bool $dryRun Si es true, no escribe cambios en disco.
     * @return void
     */
    private function versionHtmlModuleImports(
        string $html,
        string $htmlFilePath,
        ?string $forcedVersion = null,
        bool $dryRun = false
    ): void {
        $scriptPattern = '/<script\b(?=[^>]*\ssrc=["\']([^"\']+)["\'])[^>]*>/i';
        if (!preg_match_all($scriptPattern, $html, $matches)) {
            return;
        }

        $visitedJs = [];
        foreach ($matches[1] as $src) {
            $diskPath = $this->resolveAssetDiskPath($src, $htmlFilePath);
            if ($diskPath !== null && file_exists($diskPath)) {
                $this->versionJsModuleTree($diskPath, $forcedVersion, $dryRun, $visitedJs);
            }
        }
    }

    /**
     * Recorre en post-orden el árbol de módulos ES y actualiza los especificadores de importación relativos con ?v=HASH.
     *
     * @param string $jsFilePath Ruta absoluta al archivo JS en disco.
     * @param string|null $forcedVersion Versión forzada opcional.
     * @param bool $dryRun Si es true, no modifica el archivo en disco.
     * @param array $visited Mapa de archivos ya procesados para prevenir ciclos.
     * @return void
     */
    public function versionJsModuleTree(
        string $jsFilePath,
        ?string $forcedVersion = null,
        bool $dryRun = false,
        array &$visited = []
    ): void {
        $realPath = realpath($jsFilePath);
        if (!$realPath || isset($visited[$realPath]) || !file_exists($realPath)) {
            return;
        }

        $visited[$realPath] = true;
        $ext = strtolower(pathinfo($realPath, PATHINFO_EXTENSION));
        if (!in_array($ext, ['js', 'mjs'])) {
            return;
        }

        $content = file_get_contents($realPath);
        $currentDir = dirname($realPath);

        // Limpiar cualquier ?v= que pudiera haberse insertado dentro de anotaciones JSDoc {import('./...')}
        $jsdocCleanupRegex = '/([<{]\s*import\s*\(\s*[\'"]\.{1,2}\/[^\'"]+?\.m?js)\?[^\'"]*([\'"]\s*\))/i';
        $cleanedContent = preg_replace($jsdocCleanupRegex, '$1$2', $content) ?? $content;
        $jsdocCleaned = ($cleanedContent !== $content);
        $content = $cleanedContent;

        // Solo coincidir con sentencias import reales de ES Modules (excluyendo {import(...)} y <import(...)> de JSDoc)
        $importRegex = '/((?<![{<])\b(?:import\s+[^;]*?\bfrom\s*|import\s*\()\s*[\'"])(\.{1,2}\/[^\'"]+?\.m?js)(?:\?[^\'"]*)?([\'"])/i';

        // 1. Procesar recursivamente las dependencias hijas primero
        if (preg_match_all($importRegex, $content, $matches)) {
            foreach ($matches[2] as $cleanRelImport) {
                $childPath = $currentDir . '/' . $cleanRelImport;
                $this->versionJsModuleTree($childPath, $forcedVersion, $dryRun, $visited);
            }
        }

        // 2. Reemplazar cada import relativo con la versión calculada del módulo hijo
        $modified = $jsdocCleaned;
        $updatedContent = preg_replace_callback(
            $importRegex,
            function ($m) use ($currentDir, $forcedVersion, &$modified) {
                $prefix = $m[1];
                $cleanRelImport = $m[2];
                $quoteEnd = $m[3];
                $fullMatch = $m[0];

                $childDiskPath = realpath($currentDir . '/' . $cleanRelImport);
                if (!$childDiskPath || !file_exists($childDiskPath)) {
                    return $fullMatch;
                }

                $version = $forcedVersion !== null && trim($forcedVersion) !== ''
                    ? trim($forcedVersion)
                    : $this->computeAssetVersion($childDiskPath);

                $replacement = "{$prefix}{$cleanRelImport}?v={$version}{$quoteEnd}";
                if ($replacement !== $fullMatch) {
                    $modified = true;
                }
                return $replacement;
            },
            $content
        );

        if ($modified && !$dryRun && $updatedContent !== null) {
            file_put_contents($realPath, $updatedContent);
        }
    }

    /**
     * Recolecta recursivamente dependencias de archivos JavaScript (módulos ES).
     *
     * @param string $filePath Archivo actual a examinar.
     * @param array $visited Conjunto de archivos ya visitados para evitar ciclos.
     * @param int $maxMtime Referencia al mtime más reciente detectado.
     * @param array $combinedHashes Referencia a los hashes acumulados.
     */
    private function collectAssetDependencies(
        string $filePath,
        array &$visited,
        int &$maxMtime,
        array &$combinedHashes
    ): void {
        $realPath = realpath($filePath);
        if (!$realPath || isset($visited[$realPath]) || !file_exists($realPath)) {
            return;
        }

        $visited[$realPath] = true;
        $mtime = filemtime($realPath);
        if ($mtime > $maxMtime) {
            $maxMtime = $mtime;
        }

        $content = file_get_contents($realPath);

        // Si es archivo JavaScript, buscar declaraciones import relativas (con o sin ?v=...)
        $ext = strtolower(pathinfo($realPath, PATHINFO_EXTENSION));
        if (in_array($ext, ['js', 'mjs'])) {
            $currentDir = dirname($realPath);
            $importRegex = '/((?<![{<])\b(?:import\s+[^;]*?\bfrom\s*|import\s*\()\s*[\'"])(\.{1,2}\/[^\'"]+?\.m?js)(?:\?[^\'"]*)?([\'"])/i';

            // Normalizar especificadores de importación sin ?v= antes de calcular el hash MD5
            // para que el hash dependa únicamente del código real del módulo
            $normalizedContent = preg_replace($importRegex, '$1$2$3', $content) ?? $content;
            $combinedHashes[] = md5($normalizedContent);

            if (preg_match_all($importRegex, $content, $matches)) {
                foreach ($matches[2] as $relativeImport) {
                    $importedPath = $currentDir . '/' . $relativeImport;
                    $this->collectAssetDependencies($importedPath, $visited, $maxMtime, $combinedHashes);
                }
            }
        } else {
            $combinedHashes[] = md5($content);
        }
    }

    /**
     * Busca recursivamente todos los archivos .html dentro del directorio.
     *
     * @param string $dir Directorio a inspeccionar.
     * @return array Lista de rutas absolutas de archivos HTML.
     */
    private function findHtmlFiles(string $dir): array
    {
        $htmlFiles = [];
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \FilesystemIterator::SKIP_DOTS)
        );

        foreach ($iterator as $item) {
            if ($item->isFile() && strtolower($item->getExtension()) === 'html') {
                $htmlFiles[] = $item->getPathname();
            }
        }

        sort($htmlFiles);
        return $htmlFiles;
    }
}
