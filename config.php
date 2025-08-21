<?php
// config-simple.php - Versión simplificada

// Headers para evitar problemas
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Configuración básica
define('DEBUG', true);

// Configuración de base de datos
class DatabaseConfig {
    const DB_HOST = 'localhost';
    const DB_NAME = 'draftosaurus';
    const DB_USER = 'root';
    const DB_PASS = '';
}

// Clase de utilidades básica
class Utils {
    public static function jsonResponse($data, $statusCode = 200) {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    public static function errorResponse($message, $statusCode = 400) {
        self::jsonResponse([
            'success' => false,
            'message' => $message
        ], $statusCode);
    }
    
    public static function successResponse($data = null, $message = null) {
        $response = ['success' => true];
        if ($message) $response['message'] = $message;
        if ($data) $response = array_merge($response, $data);
        self::jsonResponse($response);
    }
    
    public static function validateEmail($email) {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
    
    public static function validateUsername($username) {
        return strlen($username) >= 3 && strlen($username) <= 20 && preg_match('/^[a-zA-Z0-9_]+$/', $username);
    }
    
    public static function validatePassword($password) {
        return strlen($password) >= 6;
    }
    
    public static function validateAge($birthdate) {
        $today = new DateTime();
        $birth = new DateTime($birthdate);
        return $today->diff($birth)->y >= 8;
    }
    
    public static function hashPassword($password) {
        return password_hash($password, PASSWORD_DEFAULT);
    }
    
    public static function verifyPassword($password, $hash) {
        return password_verify($password, $hash);
    }
    
    public static function logError($message) {
        error_log("[DRAFTOSAURUS] " . $message);
    }
    
    public static function logActivity($message, $userId = null) {
        error_log("[DRAFTOSAURUS ACTIVITY] " . $message . ($userId ? " - User: $userId" : ""));
    }
}

// Base de datos simplificada
class Database {
    private static $instance = null;
    private $connection = null;
    
    private function __construct() {
        try {
            $dsn = "mysql:host=" . DatabaseConfig::DB_HOST . ";dbname=" . DatabaseConfig::DB_NAME . ";charset=utf8mb4";
            $this->connection = new PDO($dsn, DatabaseConfig::DB_USER, DatabaseConfig::DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);
        } catch (PDOException $e) {
            if (DEBUG) {
                Utils::errorResponse("Database connection failed: " . $e->getMessage(), 500);
            } else {
                Utils::errorResponse("Database connection failed", 500);
            }
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->connection;
    }
}

// Manejo de sesiones simplificado
class SessionManager {
    public static function start() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }
    
    public static function set($key, $value) {
        self::start();
        $_SESSION[$key] = $value;
    }
    
    public static function get($key, $default = null) {
        self::start();
        return $_SESSION[$key] ?? $default;
    }
    
    public static function has($key) {
        self::start();
        return isset($_SESSION[$key]);
    }
    
    public static function isLoggedIn() {
        return self::has('user_id');
    }
    
    public static function getCurrentUserId() {
        return self::get('user_id');
    }
    
    public static function setUser($userId, $userData = []) {
        self::set('user_id', $userId);
        self::set('user_data', $userData);
    }
    
    public static function logout() {
        self::start();
        session_destroy();
    }
}

// Si se accede directamente a config.php, devolver status
if (basename($_SERVER['PHP_SELF']) === 'config.php') {
    Utils::successResponse([
        'status' => 'Config loaded',
        'debug' => DEBUG,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>