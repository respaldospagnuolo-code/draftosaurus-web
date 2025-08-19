<?php
// ==================== API LANZAR DADO ==================== 
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
    
    // Verificar estado de la partida
    if ($game['game_state'] === 'finished') {
        Utils::errorResponse('La partida ya ha terminado');
    }
    
    // Determinar qué jugador está tirando
    $currentPlayer = $game['current_player'];
    $currentRound = $game['current_round'];
    $currentTurn = $game['current_turn'];
    
    // Lanzar el dado (generar número aleatorio 1-6)
    $diceResult = random_int(1, 6);
    
    // Obtener configuración del dado
    $stmt = $db->prepare("
        SELECT face_number, title, description, restriction_type, restriction_value, image
        FROM dice_config 
        WHERE face_number = ?
    ");
    $stmt->execute([$diceResult]);
    $diceConfig = $stmt->fetch();
    
    if (!$diceConfig) {
        Utils::errorResponse('Error en configuración del dado');
    }
    
    // Determinar a qué jugador afecta la restricción
    $affectedPlayer = $currentPlayer === 1 ? 2 : 1;
    
    // Registrar el lanzamiento en el historial
    $stmt = $db->prepare("
        INSERT INTO dice_rolls (game_id, player_number, round_number, turn_number, dice_result, affects_player)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$gameId, $currentPlayer, $currentRound, $currentTurn, $diceResult, $affectedPlayer]);
    
    // Actualizar estado de la partida con la restricción
    $stmt = $db->prepare("
        UPDATE games 
        SET dice_restriction = ?, 
            restricted_player = ?, 
            last_dice_roll = ?,
            game_state = 'in_progress'
        WHERE id = ?
    ");
    $stmt->execute([$diceResult, $affectedPlayer, $diceResult, $gameId]);
    
    // Si es el primer dado de la partida, repartir dinosaurios
    if ($game['game_state'] === 'waiting') {
        $stmt = $db->prepare("CALL DealDinosaurs(?, ?)");
        $stmt->execute([$gameId, $currentRound]);
        
        Utils::logActivity("Dinosaurs dealt for game {$gameId}, round {$currentRound}", $userId);
    }
    
    // Preparar respuesta con la configuración del dado
    $responseData = [
        'dice_result' => $diceResult,
        'dice_config' => [
            'face_number' => $diceConfig['face_number'],
            'titulo' => $diceConfig['title'],
            'descripcion' => $diceConfig['description'],
            'imagen' => $diceConfig['image'],
            'restriction_type' => $diceConfig['restriction_type'],
            'restriction_value' => $diceConfig['restriction_value']
        ],
        'affected_player' => $affectedPlayer,
        'current_player' => $currentPlayer,
        'current_round' => $currentRound,
        'current_turn' => $currentTurn
    ];
    
    Utils::logActivity("Dice rolled: {$diceResult} in game {$gameId} by player {$currentPlayer}", $userId);
    
    Utils::successResponse($responseData);
    
} catch (Exception $e) {
    Utils::logError("Dice roll error: " . $e->getMessage());
    Utils::errorResponse('Error interno del servidor', 500);
}