<?php
// ==================== CONFIGURACIÓN DE BASE DE DATOS ==================== 

class DatabaseConfig {
    // Configuración de base de datos
    const DB_HOST = 'localhost';
    const DB_NAME = 'draftosaurus';
    const DB_USER = 'root';
    const DB_PASS = '';
    const DB_CHARSET = 'utf8mb4';
    
    // Configuración de sesión
    const SESSION_LIFETIME = 86400; // 24 horas
    const SESSION_NAME = 'DRAFTOSAURUS_SESSION';
    
    // Configuración de seguridad
    const PASSWORD_MIN_LENGTH = 6;
    const USERNAME_MIN_LENGTH = 3;
    const USERNAME_MAX_LENGTH = 20;
    const MIN_AGE = 8;
    
    // Configuración del juego
    const DINOSAURS_PER_ROUND = 6;
    const TOTAL_ROUNDS = 2;
    const MAX_PLAYERS = 2;
}

class Database {
    private static $instance = null;
    private $connection;
    
    private function __construct() {
        try {
            $dsn = "mysql:host=" . DatabaseConfig::DB_HOST . 
                   ";dbname=" . DatabaseConfig::DB_NAME . 
                   ";charset=" . DatabaseConfig::DB_CHARSET;
            
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
            ];
            
            $this->connection = new PDO($dsn, DatabaseConfig::DB_USER, DatabaseConfig::DB_PASS, $options);
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            throw new Exception("Error de conexión a la base de datos");
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
    
    // Prevenir clonación
    private function __clone() {}
    
    // Prevenir deserialización
    public function __wakeup() {
        throw new Exception("Cannot unserialize singleton");
    }
}

// ==================== UTILIDADES COMUNES ==================== 

class Utils {
    
    /**
     * Valida un email
     */
    public static function validateEmail($email) {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
    
    /**
     * Valida un nombre de usuario
     */
    public static function validateUsername($username) {
        $length = strlen($username);
        return $length >= DatabaseConfig::USERNAME_MIN_LENGTH && 
               $length <= DatabaseConfig::USERNAME_MAX_LENGTH &&
               preg_match('/^[a-zA-Z0-9_]+$/', $username);
    }
    
    /**
     * Valida una contraseña
     */
    public static function validatePassword($password) {
        return strlen($password) >= DatabaseConfig::PASSWORD_MIN_LENGTH;
    }
    
    /**
     * Valida edad mínima
     */
    public static function validateAge($birthdate) {
        $today = new DateTime();
        $birth = new DateTime($birthdate);
        $age = $today->diff($birth)->y;
        return $age >= DatabaseConfig::MIN_AGE;
    }
    
    /**
     * Genera hash seguro de contraseña
     */
    public static function hashPassword($password) {
        return password_hash($password, PASSWORD_ARGON2ID);
    }
    
    /**
     * Verifica contraseña
     */
    public static function verifyPassword($password, $hash) {
        return password_verify($password, $hash);
    }
    
    /**
     * Genera token seguro
     */
    public static function generateToken($length = 32) {
        return bin2hex(random_bytes($length));
    }
    
    /**
     * Sanitiza entrada de usuario
     */
    public static function sanitizeInput($input) {
        return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
    }
    
    /**
     * Respuesta JSON estándar
     */
    public static function jsonResponse($data, $statusCode = 200) {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    /**
     * Respuesta de error JSON
     */
    public static function errorResponse($message, $statusCode = 400, $details = null) {
        $response = [
            'success' => false,
            'message' => $message
        ];
        
        if ($details !== null) {
            $response['details'] = $details;
        }
        
        self::jsonResponse($response, $statusCode);
    }
    
    /**
     * Respuesta de éxito JSON
     */
    public static function successResponse($data = null, $message = null) {
        $response = ['success' => true];
        
        if ($message !== null) {
            $response['message'] = $message;
        }
        
        if ($data !== null) {
            $response = array_merge($response, $data);
        }
        
        self::jsonResponse($response);
    }
    
    /**
     * Validar token CSRF (para futuras implementaciones)
     */
    public static function validateCSRF($token, $sessionToken) {
        return hash_equals($sessionToken, $token);
    }
    
    /**
     * Log de errores
     */
    public static function logError($message, $context = []) {
        $timestamp = date('Y-m-d H:i:s');
        $contextString = !empty($context) ? ' - Context: ' . json_encode($context) : '';
        error_log("[$timestamp] DRAFTOSAURUS ERROR: $message$contextString");
    }
    
    /**
     * Log de actividad
     */
    public static function logActivity($message, $userId = null) {
        $timestamp = date('Y-m-d H:i:s');
        $userInfo = $userId ? " - User ID: $userId" : '';
        error_log("[$timestamp] DRAFTOSAURUS ACTIVITY: $message$userInfo");
    }
}

// ==================== MANEJO DE SESIONES ==================== 

class SessionManager {
    
    public static function start() {
        if (session_status() === PHP_SESSION_NONE) {
            session_name(DatabaseConfig::SESSION_NAME);
            session_set_cookie_params([
                'lifetime' => DatabaseConfig::SESSION_LIFETIME,
                'path' => '/',
                'secure' => isset($_SERVER['HTTPS']),
                'httponly' => true,
                'samesite' => 'Lax'
            ]);
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
    
    public static function remove($key) {
        self::start();
        unset($_SESSION[$key]);
    }
    
    public static function destroy() {
        self::start();
        session_destroy();
    }
    
    public static function regenerateId() {
        self::start();
        session_regenerate_id(true);
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
        self::regenerateId();
    }
    
    public static function logout() {
        self::start();
        $_SESSION = [];
        self::destroy();
    }
}

// ==================== CONFIGURACIÓN DE ERRORES ==================== 

// Configurar manejo de errores
error_reporting(E_ALL);
ini_set('display_errors', 0); // No mostrar errores en producción
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/logs/php_errors.log');

// Crear directorio de logs si no existe
$logDir = __DIR__ . '/logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// ==================== MANEJO GLOBAL DE ERRORES ==================== 

set_error_handler(function($severity, $message, $file, $line) {
    Utils::logError("PHP Error: $message in $file on line $line", [
        'severity' => $severity,
        'file' => $file,
        'line' => $line
    ]);
    
    // En desarrollo, mostrar el error
    if (defined('DEBUG') && DEBUG) {
        echo "Error: $message in $file on line $line\n";
    }
});

set_exception_handler(function($exception) {
    Utils::logError("Uncaught Exception: " . $exception->getMessage(), [
        'file' => $exception->getFile(),
        'line' => $exception->getLine(),
        'trace' => $exception->getTraceAsString()
    ]);
    
    // Respuesta de error genérica para el cliente
    if (!headers_sent()) {
        Utils::errorResponse('Error interno del servidor', 500);
    }
});

// ==================== CONSTANTES DE CONFIGURACIÓN ==================== 

// Configuración de entorno
define('DEBUG', false); // Cambiar a true en desarrollo
define('API_VERSION', '1.0');
define('APP_NAME', 'Draftosaurus');
define('TIMEZONE', 'America/Montevideo');

// Configurar zona horaria
date_default_timezone_set(TIMEZONE);

// ==================== HEADERS DE SEGURIDAD ==================== 

// Solo aplicar headers si no estamos en CLI
if (php_sapi_name() !== 'cli') {
    // Headers de seguridad
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('X-XSS-Protection: 1; mode=block');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    
    // CORS para desarrollo (ajustar en producción)
    if (DEBUG) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
    }
    
    // Manejar preflight requests
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}