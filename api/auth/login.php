<?php
// login-simple.php
require_once 'config.php';

// Headers CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Manejar OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Solo POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Utils::errorResponse('Método no permitido', 405);
}

try {
    SessionManager::start();
    
    // Obtener datos
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data) {
        Utils::errorResponse('Datos inválidos');
    }
    
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';
    
    // Validaciones básicas
    if (empty($email) || empty($password)) {
        Utils::errorResponse('Email y contraseña requeridos');
    }
    
    if (!Utils::validateEmail($email)) {
        Utils::errorResponse('Email inválido');
    }
    
    // *** USUARIO DE PRUEBA HARDCODEADO ***
    if ($email === 'test@test.com' && $password === 'password') {
        $user = [
            'id' => 1,
            'username' => 'testuser',
            'email' => 'test@test.com',
            'name' => 'Usuario de Prueba'
        ];
        
        SessionManager::setUser($user['id'], $user);
        
        Utils::successResponse([
            'user' => $user
        ], 'Login exitoso');
    }
    
    // Intentar con base de datos si existe
    try {
        $db = Database::getInstance()->getConnection();
        
        $stmt = $db->prepare("SELECT id, username, email, password_hash, name FROM users WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if ($user && Utils::verifyPassword($password, $user['password_hash'])) {
            SessionManager::setUser($user['id'], [
                'username' => $user['username'],
                'email' => $user['email'],
                'name' => $user['name']
            ]);
            
            Utils::successResponse([
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'email' => $user['email'],
                    'name' => $user['name']
                ]
            ], 'Login exitoso');
        }
        
    } catch (Exception $dbError) {
        Utils::logError("Database error in login: " . $dbError->getMessage());
        // Continuar sin DB
    }
    
    // Si llegamos aquí, credenciales incorrectas
    Utils::errorResponse('Credenciales incorrectas', 401);
    
} catch (Exception $e) {
    Utils::logError("Login error: " . $e->getMessage());
    Utils::errorResponse('Error interno del servidor', 500);
}
?>