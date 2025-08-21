<?php
require_once '../../config.php';

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

$username = trim($data['username'] ?? '');
$email = trim($data['email'] ?? '');
$password = $data['password'] ?? '';
$birthdate = $data['birthdate'] ?? '';

// Validaciones
if (empty($username) || empty($email) || empty($password) || empty($birthdate)) {
    Utils::errorResponse('Todos los campos son requeridos', 400);
}

if (!Utils::validateUsername($username)) {
    Utils::errorResponse('Nombre de usuario inválido (3-20 caracteres, solo letras, números y _)', 400);
}

if (!Utils::validateEmail($email)) {
    Utils::errorResponse('Email inválido', 400);
}

if (!Utils::validatePassword($password)) {
    Utils::errorResponse('La contraseña debe tener al menos 6 caracteres', 400);
}

if (!Utils::validateAge($birthdate)) {
    Utils::errorResponse('Debes tener al menos 8 años para registrarte', 400);
}

try {
    $db = Database::getInstance()->getConnection();
    
    // Verificar si el username ya existe
    $stmt = $db->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$username]);
    if ($stmt->fetch()) {
        Utils::errorResponse('El nombre de usuario ya está en uso', 409);
    }
    
    // Verificar si el email ya existe
    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        Utils::errorResponse('El email ya está registrado', 409);
    }
    
    // Hashear contraseña
    $passwordHash = Utils::hashPassword($password);
    
    // Insertar usuario
    $stmt = $db->prepare("
        INSERT INTO users (username, email, password_hash, birthdate, name, created_at) 
        VALUES (?, ?, ?, ?, ?, NOW())
    ");
    
    $stmt->execute([
        $username,
        $email,
        $passwordHash,
        $birthdate,
        $username // Usar username como name por defecto
    ]);
    
    $userId = $db->lastInsertId();
    
    Utils::logActivity("New user registered", $userId);
    
    // Respuesta exitosa
    Utils::successResponse([
        'user' => [
            'id' => $userId,
            'username' => $username,
            'email' => $email
        ]
    ], 'Usuario registrado exitosamente');
    
} catch (Exception $e) {
    Utils::logError("Registration error: " . $e->getMessage());
    Utils::errorResponse('Error interno del servidor', 500);
}
?>