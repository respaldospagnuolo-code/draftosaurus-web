<?php
header('Content-Type: application/json; charset=utf-8');
$input = json_decode(file_get_contents('php://input'), true);
$players = $input['players'] ?? [];
echo json_encode(['success'=>true, 'game_id'=>intval(microtime(true)*1000)%1000000, 'players'=>$players]);
