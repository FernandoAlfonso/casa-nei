<?php

namespace App\Shared\Db;

use PDO;
use PDOStatement;
use PDOException;
use Exception;

/**
 * DataBase - Clase para la gestión de conexión y operaciones PDO con MySQL
 * 
 * Implementa el patrón Singleton para la reutilización eficiente de la conexión,
 * y abstrae las operaciones fundamentales CRUD empleando Prepared Statements 
 * para garantizar la seguridad frente a inyecciones SQL.
 */
class DataBase
{
    private static ?DataBase $instance = null;
    private ?PDO $connection = null;

    /**
     * Constructor privado para evitar instanciación directa (Singleton).
     */
    private function __construct()
    {
        $this->connect();
    }

    /**
     * Previene la clonación de la instancia.
     */
    private function __clone() {}

    /**
     * Previene la deserealización de la instancia.
     * 
     * @throws Exception
     */
    public function __wakeup()
    {
        throw new Exception("No se permite deserealizar la instancia de DataBase.");
    }

    /**
     * Obtiene la instancia única de la base de datos (Singleton).
     *
     * @return DataBase
     */
    public static function getInstance(): DataBase
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Carga la configuración y establece la conexión PDO.
     *
     * @throws Exception Si la conexión falla
     */
    private function connect(): void
    {
        // Verificar si las constantes globales de config.php están cargadas
        if (!defined('DB_HOST')) {
            $configPath = dirname(__DIR__, 2) . '/config.php';
            if (file_exists($configPath)) {
                require_once $configPath;
            }
        }

        $host    = defined('DB_HOST')    ? DB_HOST    : 'localhost';
        $dbname  = defined('DB_NAME')    ? DB_NAME    : '';
        $user    = defined('DB_USER')    ? DB_USER    : '';
        $pass    = defined('DB_PASS')    ? DB_PASS    : '';
        $port    = defined('DB_PORT')    ? DB_PORT    : 3306;
        $charset = defined('DB_CHARSET') ? DB_CHARSET : 'utf8mb4';

        $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset={$charset}";

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => true,
        ];

        try {
            $this->connection = new PDO($dsn, $user, $pass, $options);
        } catch (PDOException $e) {
            error_log("DataBase Connection Error: " . $e->getMessage());
            throw new Exception("Error de conexión a la base de datos: " . $e->getMessage());
        }
    }

    /**
     * Retorna la conexión PDO nativa si se requiere control de bajo nivel.
     *
     * @return PDO
     */
    public function getConnection(): PDO
    {
        if ($this->connection === null) {
            $this->connect();
        }
        return $this->connection;
    }

    /**
     * Prepara y ejecuta una consulta SQL con parámetros seguros.
     *
     * @param string $sql Consulta SQL con posicionales (?) o nombrados (:param)
     * @param array $params Parámetros a vincular
     * @return PDOStatement
     * @throws Exception Si la ejecución de la consulta falla
     */
    public function query(string $sql, array $params = []): PDOStatement
    {
        try {
            $stmt = $this->getConnection()->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            error_log("DataBase Query Error [{$sql}]: " . $e->getMessage());
            throw new Exception("Error al ejecutar la consulta SQL: " . $e->getMessage());
        }
    }

    /**
     * Obtiene todos los registros resultantes de una consulta SELECT con mapeo opcional por streaming.
     * Evita la creación de un arreglo asociativo intermedio en memoria si se provee un mapper.
     *
     * @template T
     * @param string $sql Consulta SQL con marcadores seguros
     * @param array<int|string, mixed> $params Parámetros vinculados
     * @param (callable(array<string, mixed>): T)|null $mapper Función de mapeo (ej. fn($r) => Cita::fromArray($r))
     * @return ($mapper is null ? array<int, array<string, mixed>> : list<T>)
     */
    public function fetchAll(string $sql, array $params = [], ?callable $mapper = null): array
    {
        $stmt = $this->query($sql, $params);
        if ($mapper === null) {
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        $results = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $results[] = $mapper($row);
        }
        return $results;
    }

    /**
     * Obtiene un único registro resultante de una consulta SELECT con mapeo opcional.
     *
     * @template T
     * @param string $sql Consulta SQL con marcadores seguros
     * @param array<int|string, mixed> $params Parámetros vinculados
     * @param (callable(array<string, mixed>): T)|null $mapper Función de mapeo opcional
     * @return ($mapper is null ? array<string, mixed>|null : T|null)
     */
    public function fetchOne(string $sql, array $params = [], ?callable $mapper = null): mixed
    {
        $result = $this->query($sql, $params)->fetch(PDO::FETCH_ASSOC);
        if ($result === false) {
            return null;
        }
        return $mapper !== null ? $mapper($result) : $result;
    }

    /**
     * Obtiene el valor escalar de una sola columna del primer registro.
     *
     * @param string $sql
     * @param array $params
     * @param int $columnIndex Índice de la columna (por defecto 0)
     * @return mixed
     */
    public function fetchColumn(string $sql, array $params = [], int $columnIndex = 0): mixed
    {
        return $this->query($sql, $params)->fetchColumn($columnIndex);
    }

    /**
     * Ejecuta sentencias INSERT, UPDATE o DELETE y devuelve la cantidad de filas afectadas.
     *
     * @param string $sql
     * @param array $params
     * @return int Número de filas afectadas
     */
    public function execute(string $sql, array $params = []): int
    {
        return $this->query($sql, $params)->rowCount();
    }

    /**
     * Obtiene el ID generado por el último INSERT autoincremental.
     *
     * @param string|null $name Nombre de la secuencia (opcional en MySQL)
     * @return string|false
     */
    public function lastInsertId(?string $name = null): string|false
    {
        return $this->getConnection()->lastInsertId($name);
    }

    /**
     * Inicia una transacción SQL manual.
     *
     * @return bool
     */
    public function beginTransaction(): bool
    {
        return $this->getConnection()->beginTransaction();
    }

    /**
     * Confirma la transacción activa.
     *
     * @return bool
     */
    public function commit(): bool
    {
        return $this->getConnection()->commit();
    }

    /**
     * Revierte la transacción activa.
     *
     * @return bool
     */
    public function rollBack(): bool
    {
        return $this->getConnection()->rollBack();
    }

    /**
     * Comprueba si hay una transacción activa actualmente.
     *
     * @return bool
     */
    public function inTransaction(): bool
    {
        return $this->getConnection()->inTransaction();
    }

    /**
     * Ejecuta un bloque de código dentro de una transacción administrada.
     * Hace Commit automáticamente si se completa sin errores, o Rollback en caso de excepción.
     *
     * @param callable $callback Función que recibe la instancia de DataBase
     * @return mixed Retorno de la función ejecutada
     * @throws Exception
     */
    public function transaction(callable $callback): mixed
    {
        $this->beginTransaction();
        try {
            $result = $callback($this);
            $this->commit();
            return $result;
        } catch (Exception $e) {
            if ($this->inTransaction()) {
                $this->rollBack();
            }
            throw $e;
        }
    }
}
