<?php
// ==================== API INICIAR PARTIDA ==================== 
require_once '../../config.php';

// Solo permitir POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Utils::errorResponse('Método no permitido', 405);
}

// Verificar autenticación
if (!SessionManager::isLoggedIn()) {
    Utils::errorResponse('No autorizado', 401);
}

try {
    // Obtener datos de entrada
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['game_id'])) {
        Utils::errorResponse('ID de partida requerido');
    }
    
    $gameId = (int)$input['game_id'];
    $userId = SessionManager::getCurrentUserId();
    
    $db = Database::getInstance()->getConnection();
    
    // Verificar que la partida existe y el usuario es parte de ella
    $stmt = $db->prepare("
        SELECT g.*, u1.username as player1_name, u2.username as player2_name
        FROM games g
        JOIN users u1 ON g.player1_id = u1.id
        LEFT JOIN users u2 ON g.player2_id = u2.id
        WHERE g.id = ? AND (g.player1_id = ? OR g.player2_id = ?)
        LIMIT 1
    ");
    $stmt->execute([$gameId, $userId, $userId]);
    $game = $stmt->fetch();
    
    if (!$game) {
        Utils::errorResponse('Partida no encontrada o no autorizada');
    }
    
    // Verificar que la partida esté en estado correcto para empezar
    if ($game['game_state'] === 'finished') {
        Utils::errorResponse('La partida ya ha terminado');
    }
    
    if ($game['game_state'] !== 'in_progress') {
        Utils::errorResponse('La partida no está lista para comenzar');
    }
    
    // Verificar que se haya lanzado el dado inicial
    if (!$game['dice_restriction']) {
        Utils::errorResponse('Debe lanzarse el dado antes de comenzar');
    }
    
    // Obtener el estado actual del tablero y las manos
    $stmt = $db->prepare("
        SELECT 
            ph.player_number,
            ph.dinosaur_type_id,
            dt.name as dinosaur_name,
            dt.icon as dinosaur_icon,
            ph.position_in_hand,
            ph.is_played
        FROM player_hands ph
        JOIN dinosaur_types dt ON ph.dinosaur_type_id = dt.id
        WHERE ph.game_id = ? AND ph.round_number = ?
        ORDER BY ph.player_number, ph.position_in_hand
    ");
    $stmt->execute([$gameId, $game['current_round']]);
    $hands = $stmt->fetchAll();
    
    // Organizar las manos por jugador
    $player1Hand = [];
    $player2Hand = [];
    
    foreach ($hands as $hand) {
        $dinosaur = [
            'type_id' => $hand['dinosaur_type_id'],
            'name' => $hand['dinosaur_name'],
            'icon' => $hand['dinosaur_icon'],
            'position' => $hand['position_in_hand'],
            'is_played' => (bool)$hand['is_played']
        ];
        
        if ($hand['player_number'] === 1) {
            $player1Hand[] = $dinosaur;
        } else {
            $player2Hand[] = $dinosaur;
        }
    }
    
    // Obtener información de la restricción actual
    $stmt = $db->prepare("
        SELECT title, description, restriction_type, restriction_value, image
        FROM dice_config 
        WHERE face_number = ?
    ");
    $stmt->execute([$game['dice_restriction']]);
    $restriction = $stmt->fetch();
    
    // Obtener estado del tablero
    $stmt = $db->prepare("
        SELECT 
            bp.player_number,
            bp.enclosure_id,
            e.name as enclosure_name,
            e.type as enclosure_type,
            e.zone as enclosure_zone,
            bp.dinosaur_type_id,
            dt.name as dinosaur_name,
            dt.icon as dinosaur_icon,
            bp.placement_order
        FROM board_placements bp
        JOIN enclosures e ON bp.enclosure_id = e.id
        JOIN dinosaur_types dt ON bp.dinosaur_type_id = dt.id
        WHERE bp.game_id = ?
        ORDER BY bp.placement_order
    ");
    $stmt->execute([$gameId]);
    $boardState = $stmt->fetchAll();
    
    // Preparar respuesta completa del estado del juego
    $gameState = [
        'game_id' => $gameId,
        'current_round' => $game['current_round'],
        'current_turn' => $game['current_turn'],
        'current_player' => $game['current_player'],
        'restricted_player' => $game['restricted_player'],
        'player1' => [
            'id' => $game['player1_id'],
            'name' => $game['player1_name'],
            'score' => $game['player1_score'],
            'hand' => $player1Hand
        ],
        'player2' => [
            'id' => $game['player2_id'],
            'name' => $game['player2_name'] ?: $game['player2_name'],
            'score' => $game['player2_score'],
            'hand' => $player2Hand
        ],
        'current_restriction' => $restriction,
        'board_state' => $boardState,
        'game_state' => $game['game_state']
    ];
    
    Utils::logActivity("Game started: ID {$gameId}", $userId);
    
    Utils::successResponse([
        'game_state' => $gameState,
        'message' => 'Partida iniciada exitosamente'
    ]);
    
} catch (Exception $e) {
    Utils::logError("Game start error: " . $e->getMessage());
    Utils::errorResponse('Error interno del servidor', 500);
}