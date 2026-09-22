<?php
/**
 * Simple Test Runner for Casa Nei
 * Ejecuta todos los archivos que terminen en Test.php dentro del directorio tests/
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/TestCase.php';

$testDir = __DIR__;
$files = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($testDir));
$testFiles = [];

foreach ($files as $file) {
    if (!$file->isDir() && str_ends_with($file->getFilename(), 'Test.php')) {
        $testFiles[] = $file->getPathname();
    }
}

$totalTests = 0;
$totalAssertions = 0;
$failures = [];

echo "\nRunning tests...\n";

foreach ($testFiles as $file) {
    require_once $file;
    
    // Suponemos que el namespace sigue la estructura de directorios y el nombre de la clase coincide con el archivo
    $relativePath = str_replace($testDir . '/', '', $file);
    $className = 'Tests\\' . str_replace('/', '\\', str_replace('.php', '', $relativePath));
    
    if (class_exists($className)) {
        $instance = new $className();
        $methods = get_class_methods($instance);
        
        foreach ($methods as $method) {
            if (str_starts_with($method, 'test')) {
                $totalTests++;
                try {
                    $instance->setUp();
                    $instance->$method();
                    $instance->tearDown();
                    echo "."; // Éxito
                    $totalAssertions += $instance->getAssertionsCount();
                } catch (\Exception $e) {
                    echo "F"; // Fallo
                    $failures[] = [
                        'test' => $className . '::' . $method,
                        'message' => $e->getMessage()
                    ];
                }
            }
        }
    }
}

echo "\n\n";

if (count($failures) > 0) {
    echo "FAILURES!\n";
    echo "Tests: {$totalTests}, Assertions: {$totalAssertions}, Failures: " . count($failures) . "\n\n";
    foreach ($failures as $i => $failure) {
        echo ($i + 1) . ") " . $failure['test'] . "\n";
        echo "   " . $failure['message'] . "\n\n";
    }
    exit(1);
} else {
    echo "OK ({$totalTests} tests, {$totalAssertions} assertions)\n";
    exit(0);
}
