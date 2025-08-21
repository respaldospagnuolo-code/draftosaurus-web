<?php
// verify-session.php
require_once 'config.php';

SessionManager::start();

// Headers JSON
header('Content-Type: application/json');

try {
    if (SessionManager::isLoggedIn()) {
        $userId = SessionManager::getCurrentUserId();
        $userData = SessionManager::get('user_data', []);
        
        Utils::successResponse([
            'valid' => true,
            'user_id' => $userId,
            'user_data' => $userData
        ]);
    } else {
        Utils::successResponse([
            'valid' => false,
            'message' => 'No hay sesión activa'
        ]);
    }
} catch (Exception $e) {
    Utils::errorResponse('Error verificando sesión: ' . $e->getMessage(), 500);
}
?>