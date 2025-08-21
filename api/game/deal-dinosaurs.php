<?php
header('Content-Type: application/json; charset=utf-8');
$input = json_decode(file_get_contents('php://input'), true);
$gameId = $input['game_id'] ?? null;
$round  = $input['round']  ?? 1;
if (!$gameId) { echo json_encode(['success'=>false,'message'=>'game_id requerido']); exit; }
$deck = ['trex','para','tricera','stego','brachio','raptor','spino','ankylo','iguanodon','dilo','pachy','allo'];
shuffle($deck);
$player1 = array_slice($deck, 0, 6);
shuffle($deck);
$player2 = array_slice($deck, 0, 6);
echo json_encode(['success'=>true,'player1_hand'=>$player1,'player2_hand'=>$player2,'round'=>$round]);
