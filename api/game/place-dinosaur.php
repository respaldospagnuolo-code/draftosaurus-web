<?php
// ==================== API COLOCAR DINOSAURIO ==================== 
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
    
    if (!$input) {
        Utils::errorResponse('Datos inválidos');
    }
    
    $gameId = (int)($input['game_id'] ?? 0);
    $enclosureId = (int)($input['enclosure_id'] ?? 0);
    $dinosaurTypeId = (int)($input['dinosaur_type_id'] ?? 0);
    $handPosition = (int)($input['hand_position'] ?? 0);
    
    if (!$gameId || !$enclosureId || !$dinosaurTypeId || !$handPosition) {
        Utils::errorResponse('Datos incompletos');
    }
    
    $userId = SessionManager::getCurrentUserId();
    $db = Database::getInstance()->getConnection();
    
    // Verificar que la partida existe y el usuario es parte de ella
    $stmt = $db->prepare("
        SELECT g.*, 
               CASE WHEN g.player1_id = ? THEN 1 ELSE 2 END as user_player_number
        FROM games g
        WHERE g.id = ? AND (g.player1_id = ? OR g.player2_id = ?)
        LIMIT 1
    ");
    $stmt->execute([$userId, $gameId, $userId, $userId]);
    $game = $stmt->fetch();
    
    if (!$game) {
        Utils::errorResponse('Partida no encontrada o no autorizada');
    }
    
    if ($game['game_state'] !== 'in_progress') {
        Utils::errorResponse('La partida no está en curso');
    }
    
    $playerNumber = $game['user_player_number'];
    
    // Verificar que es el turno del jugador
    if ($game['current_player'] != $playerNumber) {
        Utils::errorResponse('No es tu turno');
    }
    
    // Verificar que el dinosaurio está en la mano del jugador
    $stmt = $db->prepare("
        SELECT ph.*, dt.name as dinosaur_name
        FROM player_hands ph
        JOIN dinosaur_types dt ON ph.dinosaur_type_id = dt.id
        WHERE ph.game_id = ? AND ph.player_number = ? AND ph.round_number = ? 
        AND ph.position_in_hand = ? AND ph.dinosaur_type_id = ? AND ph.is_played = FALSE
    ");
    $stmt->execute([$gameId, $playerNumber, $game['current_round'], $handPosition, $dinosaurTypeId]);
    $handCard = $stmt->fetch();
    
    if (!$handCard) {
        Utils::errorResponse('Dinosaurio no disponible en tu mano');
    }
    
    // Obtener información del recinto
    $stmt = $db->prepare("
        SELECT e.*, 
               COUNT(bp.id) as current_occupancy
        FROM enclosures e
        LEFT JOIN board_placements bp ON e.id = bp.enclosure_id 
                                      AND bp.game_id = ? 
                                      AND bp.player_number = ?
        WHERE e.id = ?
        GROUP BY e.id
    ");
    $stmt->execute([$gameId, $playerNumber, $enclosureId]);
    $enclosure = $stmt->fetch();
    
    if (!$enclosure) {
        Utils::errorResponse('Recinto no encontrado');
    }
    
    // Validar colocación
    $validation = validatePlacement($db, $gameId, $playerNumber, $enclosureId, $dinosaurTypeId, $game, $enclosure);
    
    if (!$validation['valid']) {
        Utils::errorResponse($validation['message']);
    }
    
    // Realizar la colocación
    $db->beginTransaction();
    
    try {
        // Obtener el siguiente número de orden de colocación
        $stmt = $db->prepare("
            SELECT COALESCE(MAX(placement_order), 0) + 1 as next_order
            FROM board_placements 
            WHERE game_id = ?
        ");
        $stmt->execute([$gameId]);
        $nextOrder = $stmt->fetch()['next_order'];
        
        // Insertar la colocación
        $stmt = $db->prepare("
            INSERT INTO board_placements 
            (game_id, player_number, enclosure_id, dinosaur_type_id, round_number, turn_number, placement_order, dice_restriction)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $gameId, 
            $playerNumber, 
            $enclosureId,
            $dinosaurTypeId,
            $game['current_round'],
            $game['current_turn'],
            $nextOrder,
            $game['dice_restriction']
        ]);
        
        // Marcar el dinosaurio como jugado en la mano
        $stmt = $db->prepare("
            UPDATE player_hands 
            SET is_played = TRUE, played_at = NOW()
            WHERE game_id = ? AND player_number = ? AND round_number = ? 
            AND position_in_hand = ? AND dinosaur_type_id = ?
        ");
        $stmt->execute([$gameId, $playerNumber, $game['current_round'], $handPosition, $dinosaurTypeId]);
        
        // Verificar si quedan dinosaurios en la mano
        $stmt = $db->prepare("
            SELECT COUNT(*) as remaining
            FROM player_hands 
            WHERE game_id = ? AND player_number = ? AND round_number = ? AND is_played = FALSE
        ");
        $stmt->execute([$gameId, $playerNumber, $game['current_round']]);
        $remaining = $stmt->fetch()['remaining'];
        
        // Determinar siguiente estado del juego
        $nextPlayer = $playerNumber === 1 ? 2 : 1;
        $nextTurn = $game['current_turn'];
        $nextRound = $game['current_round'];
        $newGameState = 'in_progress';
        
        // Si no quedan dinosaurios, avanzar ronda o terminar juego
        if ($remaining === 0) {
            // Verificar si el otro jugador también terminó sus dinosaurios
            $stmt = $db->prepare("
                SELECT COUNT(*) as other_remaining
                FROM player_hands 
                WHERE game_id = ? AND player_number = ? AND round_number = ? AND is_played = FALSE
            ");
            $stmt->execute([$gameId, $nextPlayer, $game['current_round']]);
            $otherRemaining = $stmt->fetch()['other_remaining'];
            
            if ($otherRemaining === 0) {
                // Ambos jugadores terminaron la ronda
                if ($game['current_round'] >= DatabaseConfig::TOTAL_ROUNDS) {
                    // Juego terminado, calcular puntuaciones finales
                    $newGameState = 'finished';
                    $scores = calculateFinalScores($db, $gameId);
                    
                    // Actualizar puntuaciones y determinar ganador
                    $winnerId = $scores['player1_score'] > $scores['player2_score'] ? $game['player1_id'] : 
                               ($scores['player1_score'] < $scores['player2_score'] ? $game['player2_id'] : null);
                    
                    $stmt = $db->prepare("
                        UPDATE games 
                        SET player1_score = ?, player2_score = ?, winner_id = ?, 
                            game_state = ?, finished_at = NOW()
                        WHERE id = ?
                    ");
                    $stmt->execute([
                        $scores['player1_score'], 
                        $scores['player2_score'], 
                        $winnerId, 
                        $newGameState, 
                        $gameId
                    ]);
                } else {
                    // Avanzar a la siguiente ronda
                    $nextRound = $game['current_round'] + 1;
                    $nextPlayer = 1; // La ronda siempre inicia con el jugador 1
                    $nextTurn = 1;
                    
                    // Repartir nuevos dinosaurios para la siguiente ronda
                    $stmt = $db->prepare("CALL DealDinosaurs(?, ?)");
                    $stmt->execute([$gameId, $nextRound]);
                }
            }
        } else {
            // Avanzar turno
            $nextTurn = $game['current_turn'] + 1;
        }
        
        // Actualizar estado del juego
        $stmt = $db->prepare("
            UPDATE games 
            SET current_player = ?, current_turn = ?, current_round = ?, 
                game_state = ?, dice_restriction = NULL, restricted_player = NULL
            WHERE id = ?
        ");
        $stmt->execute([$nextPlayer, $nextTurn, $nextRound, $newGameState, $gameId]);
        
        $db->commit();
        
        // Preparar respuesta
        $responseData = [
            'placement_successful' => true,
            'remaining_cards' => $remaining,
            'next_player' => $nextPlayer,
            'current_turn' => $nextTurn,
            'current_round' => $nextRound,
            'game_state' => $newGameState
        ];
        
        if ($newGameState === 'finished') {
            $responseData['final_scores'] = $scores;
            $responseData['winner'] = $winnerId;
        }
        
        Utils::logActivity(
            "Dinosaur placed: {$handCard['dinosaur_name']} in game {$gameId} by player {$playerNumber}", 
            $userId
        );
        
        Utils::successResponse($responseData);
        
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    Utils::logError("Placement error: " . $e->getMessage());
    Utils::errorResponse('Error interno del servidor', 500);
}

// ==================== FUNCIÓN DE VALIDACIÓN ==================== 
function validatePlacement($db, $gameId, $playerNumber, $enclosureId, $dinosaurTypeId, $game, $enclosure) {
    // 1. Verificar capacidad del recinto
    if ($enclosure['current_occupancy'] >= $enclosure['capacity']) {
        return ['valid' => false, 'message' => 'El recinto está lleno'];
    }
    
    // 2. Verificar restricción del dado (solo si afecta a este jugador)
    if ($game['restricted_player'] == $playerNumber && $game['dice_restriction']) {
        $restrictionValid = validateDiceRestriction($db, $gameId, $playerNumber, $enclosureId, $dinosaurTypeId, $game['dice_restriction']);
        if (!$restrictionValid['valid']) {
            return $restrictionValid;
        }
    }
    
    // 3. Verificar reglas específicas del recinto
    $ruleValid = validateEnclosureRules($db, $gameId, $playerNumber, $enclosureId, $dinosaurTypeId, $enclosure);
    if (!$ruleValid['valid']) {
        return $ruleValid;
    }
    
    return ['valid' => true];
}

function validateDiceRestriction($db, $gameId, $playerNumber, $enclosureId, $dinosaurTypeId, $diceRestriction) {
    // Obtener configuración de la restricción
    $stmt = $db->prepare("
        SELECT restriction_type, restriction_value 
        FROM dice_config 
        WHERE face_number = ?
    ");
    $stmt->execute([$diceRestriction]);
    $config = $stmt->fetch();
    
    if (!$config) {
        return ['valid' => true]; // Si no hay configuración, permitir
    }
    
    switch ($config['restriction_type']) {
        case 'zone':
            // Verificar que el recinto esté en la zona correcta
            $stmt = $db->prepare("SELECT zone FROM enclosures WHERE id = ?");
            $stmt->execute([$enclosureId]);
            $enclosureZone = $stmt->fetch()['zone'];
            
            if ($enclosureZone !== $config['restriction_value'] && $enclosureZone !== 'rio') {
                return ['valid' => false, 'message' => 'Debes colocar en la zona: ' . $config['restriction_value']];
            }
            break;
            
        case 'empty':
            // Verificar que el recinto esté vacío
            $stmt = $db->prepare("
                SELECT COUNT(*) as count 
                FROM board_placements 
                WHERE game_id = ? AND player_number = ? AND enclosure_id = ?
            ");
            $stmt->execute([$gameId, $playerNumber, $enclosureId]);
            $count = $stmt->fetch()['count'];
            
            if ($count > 0 && $enclosureId !== getRiverEnclosureId($db)) {
                return ['valid' => false, 'message' => 'Debes colocar en un recinto vacío'];
            }
            break;
            
        case 'no_trex':
            // Verificar que no haya T-Rex en el recinto
            $stmt = $db->prepare("
                SELECT COUNT(*) as trex_count
                FROM board_placements bp
                JOIN dinosaur_types dt ON bp.dinosaur_type_id = dt.id
                WHERE bp.game_id = ? AND bp.player_number = ? AND bp.enclosure_id = ?
                AND dt.name = 'T-Rex'
            ");
            $stmt->execute([$gameId, $playerNumber, $enclosureId]);
            $trexCount = $stmt->fetch()['trex_count'];
            
            if ($trexCount > 0 && $enclosureId !== getRiverEnclosureId($db)) {
                return ['valid' => false, 'message' => 'No puedes colocar donde hay T-Rex'];
            }
            break;
    }
    
    return ['valid' => true];
}

function validateEnclosureRules($db, $gameId, $playerNumber, $enclosureId, $dinosaurTypeId, $enclosure) {
    switch ($enclosure['type']) {
        case 'bosque_iguales':
            // Solo una especie permitida
            $stmt = $db->prepare("
                SELECT DISTINCT dinosaur_type_id 
                FROM board_placements 
                WHERE game_id = ? AND player_number = ? AND enclosure_id = ?
            ");
            $stmt->execute([$gameId, $playerNumber, $enclosureId]);
            $existingTypes = $stmt->fetchAll();
            
            if (!empty($existingTypes) && $existingTypes[0]['dinosaur_type_id'] != $dinosaurTypeId) {
                return ['valid' => false, 'message' => 'Solo una especie permitida en este bosque'];
            }
            break;
            
        case 'pradera_diferentes':
            // Todas las especies deben ser diferentes
            $stmt = $db->prepare("
                SELECT dinosaur_type_id 
                FROM board_placements 
                WHERE game_id = ? AND player_number = ? AND enclosure_id = ? AND dinosaur_type_id = ?
            ");
            $stmt->execute([$gameId, $playerNumber, $enclosureId, $dinosaurTypeId]);
            $existing = $stmt->fetch();
            
            if ($existing) {
                return ['valid' => false, 'message' => 'No puedes repetir especies en esta pradera'];
            }
            break;
            
        case 'trio_bosque':
            // Máximo 3 dinosaurios
            if ($enclosure['current_occupancy'] >= 3) {
                return ['valid' => false, 'message' => 'El trío del bosque ya está completo'];
            }
            break;
            
        case 'rey_selva':
        case 'isla_solitaria':
            // Solo 1 dinosaurio
            if ($enclosure['current_occupancy'] >= 1) {
                return ['valid' => false, 'message' => 'Este recinto solo permite un dinosaurio'];
            }
            break;
    }
    
    return ['valid' => true];
}

function getRiverEnclosureId($db) {
    $stmt = $db->prepare("SELECT id FROM enclosures WHERE type = 'rio' LIMIT 1");
    $stmt->execute();
    $result = $stmt->fetch();
    return $result ? $result['id'] : null;
}

function calculateFinalScores($db, $gameId) {
    $scores = ['player1_score' => 0, 'player2_score' => 0];
    
    // Calcular puntuación para cada jugador
    for ($player = 1; $player <= 2; $player++) {
        $playerScore = 0;
        
        // Obtener todos los recintos únicos donde el jugador colocó dinosaurios
        $stmt = $db->prepare("
            SELECT DISTINCT enclosure_id
            FROM board_placements 
            WHERE game_id = ? AND player_number = ?
        ");
        $stmt->execute([$gameId, $player]);
        $enclosures = $stmt->fetchAll();
        
        foreach ($enclosures as $enc) {
            $enclosureScore = 0;
            $stmt = $db->prepare("CALL CalculateEnclosureScore(?, ?, ?, @score)");
            $stmt->execute([$gameId, $player, $enc['enclosure_id']]);
            
            $stmt = $db->prepare("SELECT @score as score");
            $stmt->execute();
            $result = $stmt->fetch();
            
            if ($result) {
                $enclosureScore = (int)$result['score'];
                $playerScore += $enclosureScore;
            }
        }
        
        $scores["player{$player}_score"] = $playerScore;
    }
    
    return $scores;
}