<?php
// ==================== API ESTADO DEL JUEGO ==================== 
require_once '../../config.php';

// Solo permitir GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Utils::errorResponse('Método no permitido', 405);
}

// Verificar autenticación
if (!SessionManager::isLoggedIn()) {
    Utils::errorResponse('No autorizado', 401);
}

try {
    $gameId = (int)($_GET['game_id'] ?? 0);
    
    if (!$gameId) {
        Utils::errorResponse('ID de partida requerido');
    }
    
    $userId = SessionManager::getCurrentUserId();
    $db = Database::getInstance()->getConnection();
    
    // Verificar que la partida existe y el usuario es parte de ella
    $stmt = $db->prepare("
        SELECT g.*, 
               u1.username as player1_name, 
               u2.username as player2_username,
               CASE WHEN g.player1_id = ? THEN 1 ELSE 2 END as user_player_number
        FROM games g
        JOIN users u1 ON g.player1_id = u1.id
        LEFT JOIN users u2 ON g.player2_id = u2.id
        WHERE g.id = ? AND (g.player1_id = ? OR g.player2_id = ?)
        LIMIT 1
    ");
    $stmt->execute([$userId, $gameId, $userId, $userId]);
    $game = $stmt->fetch();
    
    if (!$game) {
        Utils::errorResponse('Partida no encontrada o no autorizada');
    }
    
    // Obtener las manos de los jugadores para la ronda actual
    $stmt = $db->prepare("
        SELECT 
            ph.player_number,
            ph.dinosaur_type_id,
            dt.name as dinosaur_name,
            dt.icon as dinosaur_icon,
            dt.color as dinosaur_color,
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
            'color' => $hand['dinosaur_color'],
            'position' => $hand['position_in_hand'],
            'is_played' => (bool)$hand['is_played']
        ];
        
        if ($hand['player_number'] === 1) {
            $player1Hand[] = $dinosaur;
        } else {
            $player2Hand[] = $dinosaur;
        }
    }
    
    // Obtener información de la restricción actual del dado
    $currentRestriction = null;
    if ($game['dice_restriction']) {
        $stmt = $db->prepare("
            SELECT face_number, title, description, restriction_type, restriction_value, image
            FROM dice_config 
            WHERE face_number = ?
        ");
        $stmt->execute([$game['dice_restriction']]);
        $currentRestriction = $stmt->fetch();
    }
    
    // Obtener estado actual del tablero
    $stmt = $db->prepare("
        SELECT 
            bp.player_number,
            bp.enclosure_id,
            e.name as enclosure_name,
            e.type as enclosure_type,
            e.zone as enclosure_zone,
            e.capacity as enclosure_capacity,
            e.position_x,
            e.position_y,
            bp.dinosaur_type_id,
            dt.name as dinosaur_name,
            dt.icon as dinosaur_icon,
            dt.color as dinosaur_color,
            bp.round_number,
            bp.turn_number,
            bp.placement_order
        FROM board_placements bp
        JOIN enclosures e ON bp.enclosure_id = e.id
        JOIN dinosaur_types dt ON bp.dinosaur_type_id = dt.id
        WHERE bp.game_id = ?
        ORDER BY bp.placement_order
    ");
    $stmt->execute([$gameId]);
    $boardPlacements = $stmt->fetchAll();
    
    // Organizar el tablero por jugador y recinto
    $player1Board = [];
    $player2Board = [];
    
    foreach ($boardPlacements as $placement) {
        $placementData = [
            'enclosure_id' => $placement['enclosure_id'],
            'enclosure_name' => $placement['enclosure_name'],
            'enclosure_type' => $placement['enclosure_type'],
            'enclosure_zone' => $placement['enclosure_zone'],
            'enclosure_capacity' => $placement['enclosure_capacity'],
            'position_x' => $placement['position_x'],
            'position_y' => $placement['position_y'],
            'dinosaur' => [
                'type_id' => $placement['dinosaur_type_id'],
                'name' => $placement['dinosaur_name'],
                'icon' => $placement['dinosaur_icon'],
                'color' => $placement['dinosaur_color']
            ],
            'round_placed' => $placement['round_number'],
            'turn_placed' => $placement['turn_number'],
            'order' => $placement['placement_order']
        ];
        
        if ($placement['player_number'] === 1) {
            $player1Board[] = $placementData;
        } else {
            $player2Board[] = $placementData;
        }
    }
    
    // Obtener información de todos los recintos disponibles
    $stmt = $db->prepare("
        SELECT id, name, type, capacity, zone, scoring_rule, image, position_x, position_y
        FROM enclosures
        ORDER BY position_y, position_x
    ");
    $stmt->execute();
    $allEnclosures = $stmt->fetchAll();
    
    // Obtener historial de dados de la partida
    $stmt = $db->prepare("
        SELECT 
            dr.player_number,
            dr.round_number,
            dr.turn_number,
            dr.dice_result,
            dr.affects_player,
            dc.title as dice_title,
            dc.description as dice_description,
            dr.rolled_at
        FROM dice_rolls dr
        JOIN dice_config dc ON dr.dice_result = dc.face_number
        WHERE dr.game_id = ?
        ORDER BY dr.rolled_at
    ");
    $stmt->execute([$gameId]);
    $diceHistory = $stmt->fetchAll();
    
    // Calcular puntuaciones actuales si el juego está en progreso o terminado
    $currentScores = ['player1' => 0, 'player2' => 0];
    
    if ($game['game_state'] === 'finished') {
        $currentScores['player1'] = $game['player1_score'];
        $currentScores['player2'] = $game['player2_score'];
    } else {
        // Calcular puntuaciones parciales
        for ($player = 1; $player <= 2; $player++) {
            $stmt = $db->prepare("
                SELECT DISTINCT enclosure_id
                FROM board_placements 
                WHERE game_id = ? AND player_number = ?
            ");
            $stmt->execute([$gameId, $player]);
            $enclosures = $stmt->fetchAll();
            
            $playerScore = 0;
            foreach ($enclosures as $enc) {
                $stmt = $db->prepare("CALL CalculateEnclosureScore(?, ?, ?, @score)");
                $stmt->execute([$gameId, $player, $enc['enclosure_id']]);
                
                $stmt = $db->prepare("SELECT @score as score");
                $stmt->execute();
                $result = $stmt->fetch();
                
                if ($result) {
                    $playerScore += (int)$result['score'];
                }
            }
            $currentScores["player$player"] = $playerScore;
        }
    }
    
    // Determinar qué acciones puede realizar el usuario
    $availableActions = [];
    
    if ($game['game_state'] === 'in_progress') {
        $userPlayerNumber = $game['user_player_number'];
        
        if ($game['current_player'] == $userPlayerNumber) {
            // Es el turno del usuario
            if (!$game['dice_restriction']) {
                $availableActions[] = 'roll_dice';
            } else {
                $availableActions[] = 'place_dinosaur';
            }
        } else {
            $availableActions[] = 'wait_turn';
        }
    }
    
    // Preparar respuesta completa del estado del juego
    $gameState = [
        'game_id' => $gameId,
        'game_state' => $game['game_state'],
        'current_round' => $game['current_round'],
        'total_rounds' => DatabaseConfig::TOTAL_ROUNDS,
        'current_turn' => $game['current_turn'],
        'current_player' => $game['current_player'],
        'restricted_player' => $game['restricted_player'],
        'user_player_number' => $game['user_player_number'],
        'created_at' => $game['created_at'],
        'finished_at' => $game['finished_at'],
        'winner_id' => $game['winner_id'],
        'players' => [
            'player1' => [
                'id' => $game['player1_id'],
                'name' => $game['player1_name'],
                'score' => $currentScores['player1'],
                'hand' => $player1Hand,
                'board' => $player1Board
            ],
            'player2' => [
                'id' => $game['player2_id'],
                'name' => $game['player2_username'] ?: $game['player2_name'],
                'type' => $game['player2_type'],
                'score' => $currentScores['player2'],
                'hand' => $player2Hand,
                'board' => $player2Board
            ]
        ],
        'current_restriction' => $currentRestriction,
        'available_enclosures' => $allEnclosures,
        'dice_history' => $diceHistory,
        'available_actions' => $availableActions,
        'last_updated' => date('Y-m-d H:i:s')
    ];
    
    Utils::successResponse(['game_state' => $gameState]);
    
} catch (Exception $e) {
    Utils::logError("Game state error: " . $e->getMessage());
    Utils::errorResponse('Error interno del servidor', 500);
}