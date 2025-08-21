<?php
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
  'success'=>true,
  'state'=>[
    'round'=>1,
    'turn'=>1,
    'currentPlayer'=>1,
    'scores'=>[0,0],
    'board'=>[]
  ]
]);
