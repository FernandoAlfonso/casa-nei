<?php

/**
 * Script CLI: Gestión y Actualización Inteligente de Versiones de Assets (CSS y JS)
 *
 * Escanea todos los archivos HTML del aplicativo Casa Nei y actualiza automáticamente
 * los parámetros "?v=" con base en el hash y fecha real del contenido del archivo y de sus
 * submódulos dependientes.
 *
 * Uso:
 *   php scripts/version_assets.php              # Actualiza los HTML si hubo cambios reales
 *   php scripts/version_assets.php --dry-run    # Simula la ejecución sin modificar archivos
 *   php scripts/version_assets.php --force=XYZ  # Aplica una versión forzada global
 *
 * @package CasaNei\Scripts
 */

require_once __DIR__ . '/../src/Shared/autoload.php';

use App\Shared\Utils\AssetVersioner;

$publicDir = realpath(__DIR__ . '/../public');
if (!$publicDir) {
    fwrite(STDERR, "Error: No se encontró el directorio public.\n");
    exit(1);
}

// Analizar argumentos CLI
$options = getopt('', ['dry-run', 'check', 'force:', 'version:', 'help']);

if (isset($options['help'])) {
    echo "\nUso: php scripts/version_assets.php [opciones]\n";
    echo "Opciones:\n";
    echo "  --dry-run, --check    Simular los cambios sin modificar los archivos en disco.\n";
    echo "  --force=VALOR         Forzar una cadena de versión fija en todos los assets.\n";
    echo "  --help                Mostrar esta ayuda.\n\n";
    exit(0);
}

$dryRun = isset($options['dry-run']) || isset($options['check']);
$forcedVersion = $options['force'] ?? $options['version'] ?? null;

$versioner = new AssetVersioner($publicDir, '/casa-nei');

echo "\n=========================================================\n";
echo "  Casa Nei - Sincronizador Inteligente de Versiones\n";
echo "=========================================================\n";
echo "Modo: " . ($dryRun ? "[SIMULACIÓN / DRY-RUN]" : "[APLICACIÓN DIRECTA]") . "\n";
if ($forcedVersion) {
    echo "Versión forzada: {$forcedVersion}\n";
}
echo "Directorio public: {$publicDir}\n\n";

$results = $versioner->versionAllHtml($forcedVersion, $dryRun);

$totalFiles = count($results);
$filesModified = 0;
$totalAssets = 0;
$assetsUpdated = 0;

foreach ($results as $fileResult) {
    $relativePath = $fileResult['relativePath'] ?: basename($fileResult['file']);
    $statusText = $fileResult['modified'] ? ($dryRun ? '⚠️  CAMBIOS PENDIENTES' : '✅ ACTUALIZADO') : '✨ SIN CAMBIOS';

    echo "📄 {$relativePath}  ->  {$statusText}\n";

    if ($fileResult['modified']) {
        $filesModified++;
    }

    if (empty($fileResult['assets'])) {
        echo "   (No contiene enlaces locales a CSS o JS)\n\n";
        continue;
    }

    foreach ($fileResult['assets'] as $asset) {
        $totalAssets++;
        $assetName = $asset['clean_path'];
        $oldV = $asset['old_version'] ?? '(ninguna)';
        $newV = $asset['new_version'];

        if ($asset['changed']) {
            $assetsUpdated++;
            echo "   🔄 {$assetName}\n";
            echo "      Anterior: {$oldV}  ==>  Nueva: {$newV}\n";
        } else {
            echo "   🆗 {$assetName} ({$newV})\n";
        }
    }
    echo "\n";
}

echo "---------------------------------------------------------\n";
echo "Resumen de ejecución:\n";
echo "  - Archivos HTML procesados: {$totalFiles}\n";
echo "  - Archivos HTML modificados: {$filesModified}\n";
echo "  - Total de recursos evaluados: {$totalAssets}\n";
echo "  - Recursos con versión actualizada: {$assetsUpdated}\n";
echo "=========================================================\n\n";

exit(0);
