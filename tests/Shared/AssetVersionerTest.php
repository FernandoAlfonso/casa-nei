<?php

namespace Tests\Shared;

use Tests\TestCase;
use App\Shared\Utils\AssetVersioner;

/**
 * Pruebas unitarias para la clase AssetVersioner.
 */
class AssetVersionerTest extends TestCase
{
    private string $tempDir;
    private string $tempPublic;

    public function setUp(): void
    {
        $this->tempDir = sys_get_temp_dir() . '/asset_versioner_test_' . uniqid();
        $this->tempPublic = $this->tempDir . '/public';
        mkdir($this->tempPublic . '/css', 0777, true);
        mkdir($this->tempPublic . '/js', 0777, true);
    }

    public function tearDown(): void
    {
        $this->recursiveRmdir($this->tempDir);
    }

    private function recursiveRmdir(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        $files = array_diff(scandir($dir), ['.', '..']);
        foreach ($files as $file) {
            $path = $dir . '/' . $file;
            is_dir($path) ? $this->recursiveRmdir($path) : unlink($path);
        }
        rmdir($dir);
    }

    /**
     * Valida que la resolución de rutas en disco gestione correctamente
     * rutas relativas, absolutas con prefijo /casa-nei/ e ignore URLs externas.
     */
    public function testResolveAssetDiskPath(): void
    {
        $versioner = new AssetVersioner($this->tempPublic, '/casa-nei');

        $htmlFile = $this->tempPublic . '/index.html';
        file_put_contents($this->tempPublic . '/style.css', 'body{}');

        // Ruta relativa
        $resolved = $versioner->resolveAssetDiskPath('style.css', $htmlFile);
        $this->assertEquals(realpath($this->tempPublic . '/style.css'), $resolved);

        // Ruta con prefijo de producción /casa-nei/
        $resolvedPrefix = $versioner->resolveAssetDiskPath('/casa-nei/style.css', $htmlFile);
        $this->assertEquals(realpath($this->tempPublic . '/style.css'), $resolvedPrefix);

        // URLs externas deben retornar null
        $this->assertEquals(null, $versioner->resolveAssetDiskPath('https://fonts.googleapis.com/css', $htmlFile));
        $this->assertEquals(null, $versioner->resolveAssetDiskPath('//cdnjs.cloudflare.com/lib.css', $htmlFile));
    }

    /**
     * Valida que el cálculo de versión sea determinista y cambie al modificar el contenido.
     */
    public function testComputeAssetVersionChangesWhenContentChanges(): void
    {
        $versioner = new AssetVersioner($this->tempPublic);
        $cssFile = $this->tempPublic . '/style.css';

        file_put_contents($cssFile, 'body { color: red; }');
        $version1 = $versioner->computeAssetVersion($cssFile);

        $this->assertTrue(str_contains($version1, '-'), "La versión debe tener formato YYYYMMDD-hash");

        // Mismo contenido debe dar misma versión
        $version1Repetida = $versioner->computeAssetVersion($cssFile);
        $this->assertEquals($version1, $version1Repetida);

        // Modificar contenido debe alterar el hash
        file_put_contents($cssFile, 'body { color: blue; }');
        $version2 = $versioner->computeAssetVersion($cssFile);

        $this->assertTrue($version1 !== $version2, "La versión debe cambiar cuando el contenido del archivo cambia.");
    }

    /**
     * Valida que al procesar HTML se actualicen los tags <link> y <script>
     * manteniendo intactos los recursos externos.
     */
    public function testProcessHtmlContentUpdatesTags(): void
    {
        $versioner = new AssetVersioner($this->tempPublic, '/casa-nei');

        file_put_contents($this->tempPublic . '/style.css', 'body{margin:0}');
        file_put_contents($this->tempPublic . '/app.js', 'console.log(1)');

        $html = '<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/font-awesome.css">
    <link rel="stylesheet" href="style.css?v=20200101">
</head>
<body>
    <script src="app.js"></script>
    <script src="https://cdn.example.com/external.js"></script>
</body>
</html>';

        $htmlPath = $this->tempPublic . '/index.html';
        $result = $versioner->processHtmlContent($html, $htmlPath);

        $this->assertTrue($result['modified']);
        $this->assertTrue(str_contains($result['content'], 'https://cdnjs.cloudflare.com/font-awesome.css'), "No debe alterar enlaces externos");
        $this->assertTrue(str_contains($result['content'], 'https://cdn.example.com/external.js'), "No debe alterar scripts externos");
        $this->assertFalse(str_contains($result['content'], 'v=20200101'), "Debe reemplazar la versión anterior");
        $this->assertTrue(str_contains($result['content'], 'app.js?v='), "Debe agregar versión al script sin versión");
    }

    /**
     * Valida que el cambio en un submódulo ES importado afecte la versión del archivo principal.
     */
    public function testESModuleDependencyHashing(): void
    {
        $versioner = new AssetVersioner($this->tempPublic);

        $mainJs = $this->tempPublic . '/js/main.js';
        $componentJs = $this->tempPublic . '/js/component.js';

        file_put_contents($componentJs, 'export const name = "Alfa";');
        file_put_contents($mainJs, 'import { name } from "./component.js"; console.log(name);');

        $versionA = $versioner->computeAssetVersion($mainJs);

        // Modificar solo el componente hijo
        file_put_contents($componentJs, 'export const name = "Beta";');
        $versionB = $versioner->computeAssetVersion($mainJs);

        $this->assertTrue($versionA !== $versionB, "Modificar un submódulo importado debe invalidar el hash del entry point.");
    }
}
