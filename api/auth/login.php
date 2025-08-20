<?php
require_once 'config.php';

SessionManager::start();

// Validar método
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Utils::errorResponse('Método no permitido', 405);
}

// Obtener datos JSON
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    Utils::errorResponse('Datos inválidos', 400);
}

$email = $data['email'] ?? '';
$password = $data['password'] ?? '';

// Validaciones básicas
if (empty($email) || empty($password)) {
    Utils::errorResponse('Email y contraseña son requeridos', 400);
}

if (!Utils::validateEmail($email)) {
    Utils::errorResponse('Email inválido', 400);
}

try {
    $db = Database::getInstance()->getConnection();
    
    // Buscar usuario por email
    $stmt = $db->prepare("SELECT id, username, email, password_hash, name FROM users WHERE email = ? AND active = 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user) {
        Utils::errorResponse('Credenciales incorrectas', 401);
    }
    
    // Verificar contraseña
    if (!Utils::verifyPassword($password, $user['password_hash'])) {
        Utils::errorResponse('Credenciales incorrectas', 401);
    }
    
    // Crear sesión
    SessionManager::setUser($user['id'], [
        'username' => $user['username'],
        'email' => $user['email'],
        'name' => $user['name']
    ]);
    
    // Actualizar último acceso
    $stmt = $db->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
    $stmt->execute([$user['id']]);
    
    Utils::logActivity("User login successful", $user['id']);
    
    // Respuesta exitosa
    Utils::successResponse([
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'name' => $user['name']
        ]
    ], 'Login exitoso');
    
} catch (Exception $e) {
    Utils::logError("Login error: " . $e->getMessage());
    Utils::errorResponse('Error interno del servidor', 500);
}
?>