import { SanitizerTest } from './SanitizerTest.js';

/**
 * Script de ejecución de pruebas sencillas para el frontend.
 * Se ejecuta con: node public/js/tests/run.js
 */
async function runTests() {
  const tests = [
    new SanitizerTest(),
    // Agregar aquí más clases de prueba en el futuro
  ];

  let totalTests = 0;
  let totalAssertions = 0;
  let failures = [];

  console.log('Running frontend tests...\n');

  for (const testInstance of tests) {
    const className = testInstance.constructor.name;
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(testInstance));

    for (const method of methods) {
      if (method.startsWith('test') && typeof testInstance[method] === 'function') {
        totalTests++;
        try {
          testInstance.setUp();
          testInstance[method]();
          testInstance.tearDown();
          process.stdout.write('.');
          totalAssertions += testInstance.getAssertionsCount();
        } catch (error) {
          process.stdout.write('F');
          failures.push({
            test: `${className}::${method}`,
            message: error.message
          });
        }
      }
    }
  }

  console.log('\n\n');

  if (failures.length > 0) {
    console.log('FAILURES!');
    console.log(`Tests: ${totalTests}, Assertions: ${totalAssertions}, Failures: ${failures.length}\n`);
    failures.forEach((failure, index) => {
      console.log(`${index + 1}) ${failure.test}`);
      console.log(`   ${failure.message}\n`);
    });
    process.exit(1);
  } else {
    console.log(`OK (${totalTests} tests, ${totalAssertions} assertions)\n`);
    process.exit(0);
  }
}

runTests();
