<?php
require_once '../../config.php';

if (!SessionManager::isLoggedIn()) {
    Utils::errorResponse('No autorizado', 401);
}

try {
    $db = Database::getInstance()->getConnection();
    $userId = SessionManager::getCurrentUserId();
    
    $stmt = $db->prepare("DELETE FROM games WHERE (player1_id = ? OR player2_id = ?) AND game_state IN ('waiting', 'in_progress')");
    $stmt->execute([$userId, $userId]);
    
    Utils::successResponse(['message' => 'Partidas activas eliminadas']);
} catch (Exception $e) {
    Utils::errorResponse('Error interno', 500);
}
?>