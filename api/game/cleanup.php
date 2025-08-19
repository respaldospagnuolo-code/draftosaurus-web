<?php
require_once '../../config.php';

if (!SessionManager::isLoggedIn()) {
    Utils::errorResponse('No autorizado', 401);
}

try {
    $db = Database::getInstance()->getConnection();
    $userId = SessionManager::getCurrentUserId();
    
    // Eliminar TODAS las partidas activas del usuario
    $stmt = $db->prepare("DELETE FROM games WHERE (player1_id = ? OR player2_id = ?) AND game_state IN ('waiting', 'in_progress')");
    $stmt->execute([$userId, $userId]);
    
    $partidasEliminadas = $stmt->rowCount();
    
    Utils::successResponse([
        'message' => "Se eliminaron $partidasEliminadas partidas activas",
        'games_deleted' => $partidasEliminadas
    ]);
} catch (Exception $e) {
    Utils::errorResponse('Error interno', 500);
}
?>