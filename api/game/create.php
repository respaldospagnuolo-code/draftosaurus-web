<?php
// ==================== API CREAR PARTIDA ==================== 
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
    
    $player1Data = $input['player1'] ?? [];
    $player2Data = $input['player2'] ?? [];
    
    // Validaciones
    if (empty($player2Data['name'])) {
        Utils::errorResponse('El nombre del segundo jugador es requerido');
    }
    
    $player1Id = SessionManager::getCurrentUserId();
    $player2Name = Utils::sanitizeInput($player2Data['name']);
    $player2Type = $player2Data['type'] ?? 'invitado';
    $player2Id = null;
    
    // Si el jugador 2 es un usuario registrado, buscarlo
    if ($player2Type === 'usuario') {
        $db = Database::getInstance()->getConnection();
        
        $stmt = $db->prepare("
            SELECT id, username 
            FROM users 
            WHERE username = ? 
            LIMIT 1
        ");
        $stmt->execute([$player2Name]);
        $player2User = $stmt->fetch();
        
        if (!$player2User) {
            Utils::errorResponse('Usuario no encontrado');
        }
        
        $player2Id = $player2User['id'];
        $player2Name = $player2User['username'];
    }
    
    // Verificar si el usuario no está en otra partida activa
    $db = Database::getInstance()->getConnection();
    
    $stmt = $db->prepare("
        SELECT COUNT(*) as active_games 
        FROM games 
        WHERE (player1_id = ? OR player2_id = ?) 
        AND game_state IN ('waiting', 'in_progress')
    ");
    $stmt->execute([$player1Id, $player1Id]);
    $result = $stmt->fetch();
    
    if ($result['active_games'] > 0) {
        Utils::errorResponse('Ya tienes una partida activa');
    }
    
    // Crear la partida usando el procedimiento almacenado
    $stmt = $db->prepare("CALL CreateGame(?, ?, ?, ?)");
    $stmt->execute([$player1Id, $player2Name, $player2Type, $player2Id]);
    $result = $stmt->fetch();
    
    if ($result['status'] !== 'success') {
        Utils::errorResponse('Error al crear la partida');
    }
    
    $gameId = $result['game_id'];
    
    // Obtener información completa de la partida creada
    $stmt = $db->prepare("
        SELECT g.*, u1.username as player1_name, u2.username as player2_username
        FROM games g
        JOIN users u1 ON g.player1_id = u1.id
        LEFT JOIN users u2 ON g.player2_id = u2.id
        WHERE g.id = ?
    ");
    $stmt->execute([$gameId]);
    $game = $stmt->fetch();
    
    if (!$game) {
        Utils::errorResponse('Error al obtener información de la partida');
    }
    
    // Preparar respuesta
    $gameData = [
        'id' => $game['id'],
        'player1' => [
            'id' => $game['player1_id'],
            'name' => $game['player1_name'],
            'type' => 'registered'
        ],
        'player2' => [
            'id' => $game['player2_id'],
            'name' => $game['player2_name'],
            'type' => $game['player2_type']
        ],
        'current_round' => $game['current_round'],
        'current_turn' => $game['current_turn'],
        'current_player' => $game['current_player'],
        'game_state' => $game['game_state'],
        'created_at' => $game['created_at']
    ];
    
    Utils::logActivity("Game created: ID {$gameId}", $player1Id);
    
    Utils::successResponse([
        'game' => $gameData,
        'message' => 'Partida creada exitosamente'
    ]);
    
} catch (Exception $e) {
    Utils::logError("Game creation error: " . $e->getMessage());
    Utils::errorResponse('Error interno del servidor', 500);
}