<?php
// ==================== API REGISTRO ==================== 
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
    $email = Utils::sanitizeInput($input['email'] ?? '');
    $birthdate = $input['birthdate'] ?? '';
    $password = $input['password'] ?? '';
    $passwordConfirm = $input['passwordConfirm'] ?? '';
    
    // Validaciones
    $errors = [];
    
    if (empty($username)) {
        $errors[] = 'El nombre de usuario es requerido';
    } elseif (!Utils::validateUsername($username)) {
        $errors[] = 'El nombre de usuario debe tener entre 3 y 20 caracteres y solo contener letras, números y guiones bajos';
    }
    
    if (empty($email)) {
        $errors[] = 'El email es requerido';
    } elseif (!Utils::validateEmail($email)) {
        $errors[] = 'El email no tiene un formato válido';
    }
    
    if (empty($birthdate)) {
        $errors[] = 'La fecha de nacimiento es requerida';
    } elseif (!Utils::validateAge($birthdate)) {
        $errors[] = 'Debes tener al menos ' . DatabaseConfig::MIN_AGE . ' años para registrarte';
    }
    
    if (empty($password)) {
        $errors[] = 'La contraseña es requerida';
    } elseif (!Utils::validatePassword($password)) {
        $errors[] = 'La contraseña debe tener al menos ' . DatabaseConfig::PASSWORD_MIN_LENGTH . ' caracteres';
    }
    
    if ($password !== $passwordConfirm) {
        $errors[] = 'Las contraseñas no coinciden';
    }
    
    if (!empty($errors)) {
        Utils::errorResponse('Errores de validación', 422, $errors);
    }
    
    // Verificar si el usuario ya existe
    $db = Database::getInstance()->getConnection();
    
    $stmt = $db->prepare("
        SELECT COUNT(*) as count 
        FROM users 
        WHERE username = ? OR email = ?
    ");
    $stmt->execute([$username, $email]);
    $result = $stmt->fetch();
    
    if ($result['count'] > 0) {
        // Verificar qué campo específico está duplicado
        $stmt = $db->prepare("SELECT username, email FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$username, $email]);
        $existing = $stmt->fetch();
        
        if ($existing['username'] === $username) {
            Utils::errorResponse('El nombre de usuario ya está en uso');
        } else {
            Utils::errorResponse('El email ya está registrado');
        }
    }
    
    // Crear nuevo usuario
    $passwordHash = Utils::hashPassword($password);
    
    $stmt = $db->prepare("
        INSERT INTO users (username, email, password_hash, birthdate, name)
        VALUES (?, ?, ?, ?, ?)
    ");
    
    $name = ucfirst($username); // Nombre por defecto
    
    if (!$stmt->execute([$username, $email, $passwordHash, $birthdate, $name])) {
        Utils::errorResponse('Error al crear la cuenta');
    }
    
    $userId = $db->lastInsertId();
    
    // Iniciar sesión automáticamente
    SessionManager::setUser($userId, [
        'username' => $username,
        'email' => $email,
        'name' => $name
    ]);
    
    // Preparar respuesta
    $userData = [
        'id' => $userId,
        'username' => $username,
        'email' => $email,
        'name' => $name,
        'stats' => [
            'won' => 0,
            'lost' => 0,
            'total_score' => 0
        ]
    ];
    
    Utils::logActivity("New user registered: $username", $userId);
    
    Utils::successResponse([
        'user' => $userData,
        'message' => 'Cuenta creada exitosamente'
    ]);
    
} catch (Exception $e) {
    Utils::logError("Registration error: " . $e->getMessage());
    Utils::errorResponse('Error interno del servidor', 500);
}