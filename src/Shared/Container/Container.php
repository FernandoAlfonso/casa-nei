<?php

namespace App\Shared\Container;

use Closure;
use Exception;
use ReflectionClass;
use ReflectionNamedType;
use ReflectionParameter;
use Throwable;

/**
 * Class Container
 *
 * Contenedor de Inyección de Dependencias ligero con soporte de auto-wiring por Reflection,
 * registro de Singletons y Factories. Diseñado para PHP 8.1+ sin dependencias externas.
 *
 * @package App\Shared\Container
 */
class Container implements ContainerInterface
{
  /**
   * Instancia única global (opcional, para acceso estático si se requiere).
   */
  private static ?Container $instance = null;

  /**
   * Definiciones de servicios o fábricas registradas.
   *
   * @var array<string, mixed>
   */
  private array $definitions = [];

  /**
   * Instancias compartidas (Singletons ya resueltos).
   *
   * @var array<string, mixed>
   */
  private array $instances = [];

  /**
   * Marcas para indicar qué identificadores deben comportarse como Singletons.
   *
   * @var array<string, bool>
   */
  private array $singletons = [];

  /**
   * Obtiene o inicializa la instancia global del contenedor.
   *
   * @return Container
   */
  public static function getInstance(): Container
  {
    if (self::$instance === null) {
      self::$instance = new self();
    }
    return self::$instance;
  }

  /**
   * Establece una instancia global personalizada.
   *
   * @param Container $container
   * @return void
   */
  public static function setInstance(Container $container): void
  {
    self::$instance = $container;
  }

  /**
   * Registra una instancia ya creada en el contenedor.
   *
   * @param string $id Identificador del servicio.
   * @param mixed $instance Objeto o valor a almacenar.
   * @return self
   */
  public function set(string $id, mixed $instance): self
  {
    $this->instances[$id] = $instance;
    return $this;
  }

  /**
   * Registra un servicio como Singleton (se resolverá una sola vez y se reusará).
   *
   * @param string $id Identificador o nombre de clase.
   * @param callable|string|null $concrete Closure fábrica, clase concreta o null para auto-wiring.
   * @return self
   */
  public function singleton(string $id, callable|string|null $concrete = null): self
  {
    $this->definitions[$id] = $concrete ?? $id;
    $this->singletons[$id] = true;
    return $this;
  }

  /**
   * Registra un servicio como Fábrica (se ejecuta una nueva resolución en cada llamada a get).
   *
   * @param string $id Identificador o nombre de clase.
   * @param callable|string $concrete Closure o clase concreta.
   * @return self
   */
  public function factory(string $id, callable|string $concrete): self
  {
    $this->definitions[$id] = $concrete;
    $this->singletons[$id] = false;
    return $this;
  }

  /**
   * Retorna true si el contenedor tiene registrado o puede resolver el identificador dado.
   *
   * @param string $id
   * @return bool
   */
  public function has(string $id): bool
  {
    return isset($this->instances[$id])
      || isset($this->definitions[$id])
      || class_exists($id);
  }

  /**
   * Resuelve y retorna el servicio solicitado.
   *
   * @template T
   * @param class-string<T>|string $id
   * @return T|mixed
   * @throws Exception Si no se puede resolver la dependencia.
   */
  public function get(string $id): mixed
  {
    // 1. Retornar instancia existente si ya fue resuelta como Singleton
    if (isset($this->instances[$id])) {
      return $this->instances[$id];
    }

    // 2. Si no existe definición pero la clase existe, registrarla para auto-wiring como Singleton por defecto
    if (!isset($this->definitions[$id])) {
      if (!class_exists($id)) {
        throw new Exception("El servicio o clase '{$id}' no está registrado en el contenedor y no existe.");
      }
      $this->definitions[$id] = $id;
      $this->singletons[$id] = true;
    }

    $definition = $this->definitions[$id];
    $isSingleton = $this->singletons[$id] ?? false;

    // 3. Resolver según el tipo de definición
    $resolved = match (true) {
      $definition instanceof Closure => $definition($this),
      is_callable($definition) => call_user_func($definition, $this),
      is_string($definition) && class_exists($definition) => $this->resolveClass($definition),
      default => $definition
    };

    // 4. Cachear si es Singleton
    if ($isSingleton) {
      $this->instances[$id] = $resolved;
    }

    return $resolved;
  }

  /**
   * Resuelve una clase concreta inspeccionando su constructor y sus dependencias (Auto-wiring).
   *
   * @param string $className
   * @return object
   * @throws Exception
   */
  private function resolveClass(string $className): object
  {
    try {
      $reflector = new ReflectionClass($className);
    } catch (Throwable $e) {
      throw new Exception("No se pudo reflejar la clase '{$className}': " . $e->getMessage(), 0, $e);
    }

    if (!$reflector->isInstantiable()) {
      throw new Exception("La clase '{$className}' no es instanciable (puede ser abstracta o una interfaz).");
    }

    $constructor = $reflector->getConstructor();
    if ($constructor === null) {
      return new $className();
    }

    $parameters = $constructor->getParameters();
    if (empty($parameters)) {
      return new $className();
    }

    $dependencies = [];
    foreach ($parameters as $parameter) {
      $dependencies[] = $this->resolveParameter($parameter, $className);
    }

    return $reflector->newInstanceArgs($dependencies);
  }

  /**
   * Resuelve un parámetro individual de un constructor.
   *
   * @param ReflectionParameter $parameter
   * @param string $className
   * @return mixed
   * @throws Exception
   */
  private function resolveParameter(ReflectionParameter $parameter, string $className): mixed
  {
    $type = $parameter->getType();

    // Si no tiene tipo declarado o es un tipo primitivo (string, int, etc.)
    if (!$type instanceof ReflectionNamedType || $type->isBuiltin()) {
      if ($parameter->isDefaultValueAvailable()) {
        return $parameter->getDefaultValue();
      }
      if ($parameter->allowsNull()) {
        return null;
      }
      throw new Exception("No se puede resolver el parámetro '{$parameter->getName()}' de '{$className}' (sin tipo o primitivo sin valor por defecto).");
    }

    $targetClass = $type->getName();

    try {
      return $this->get($targetClass);
    } catch (Throwable $e) {
      if ($parameter->isDefaultValueAvailable()) {
        return $parameter->getDefaultValue();
      }
      if ($parameter->allowsNull()) {
        return null;
      }
      throw new Exception(
        "Fallo al resolver la dependencia '{$targetClass}' para '{$className}': " . $e->getMessage(),
        0,
        $e
      );
    }
  }
}
