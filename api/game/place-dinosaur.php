<?php
header('Content-Type: application/json; charset=utf-8');
$input = json_decode(file_get_contents('php://input'), true);
$gameId = $input['game_id'] ?? null;
$player = $input['player'] ?? 1;
$zone   = $input['zone'] ?? 'unknown';
$dino   = $input['dinosaur'] ?? 'unknown';
if (!$gameId || $dino==='unknown' || $zone==='unknown') {
  echo json_encode(['success'=>false,'message'=>'parámetros incompletos']); exit;
}
echo json_encode(['success'=>true,'placed'=>['player'=>$player,'zone'=>$zone,'dinosaur'=>$dino]]);
