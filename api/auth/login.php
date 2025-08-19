<?php
// ==================== API LOGIN ==================== 
require_once '../../config.php';

// Solo permitir POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Utils::errorResponse('Método no permitido', 405);
}

try {
    // Obtener datos de entrada
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        Utils::errorResponse('Datos inválidos');
    }
    
    $username = Utils::sanitizeInput($input['username'] ?? '');
    $password = $input['password'] ?? '';
    
    // Validaciones básicas
    if (empty($username) || empty($password)) {
        Utils::errorResponse('Usuario y contraseña son requeridos');
    }
    
    // Buscar usuario en la base de datos
    $db = Database::getInstance()->getConnection();
    
    $stmt = $db->prepare("
        SELECT id, username, email, password_hash, name, games_won, games_lost, total_score
        FROM users 
        WHERE username = ? OR email = ?
        LIMIT 1
    ");
    
    $stmt->execute([$username, $username]);
    $user = $stmt->fetch();
    
    if (!$user) {
        Utils::errorResponse('Usuario o contraseña incorrectos');
    }
    
    // Verificar contraseña
    if (!Utils::verifyPassword($password, $user['password_hash'])) {
        Utils::errorResponse('Usuario o contraseña incorrectos');
    }
    
    // Iniciar sesión
    SessionManager::setUser($user['id'], [
        'username' => $user['username'],
        'email' => $user['email'],
        'name' => $user['name']
    ]);
    
    // Preparar respuesta
    $userData = [
        'id' => $user['id'],
        'username' => $user['username'],
        'email' => $user['email'],
        'name' => $user['name'] ?: $user['username'],
        'stats' => [
            'won' => (int)$user['games_won'],
            'lost' => (int)$user['games_lost'],
            'total_score' => (int)$user['total_score']
        ]
    ];
    
    Utils::logActivity("User logged in: {$user['username']}", $user['id']);
    
    Utils::successResponse([
        'user' => $userData,
        'message' => 'Inicio de sesión exitoso'
    ]);
    
} catch (Exception $e) {
    Utils::logError("Login error: " . $e->getMessage());
    Utils::errorResponse('Error interno del servidor', 500);
}