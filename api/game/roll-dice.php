<?php
header('Content-Type: application/json; charset=utf-8');
$faces = [1,2,3,4,5,6];
$roll = $faces[array_rand($faces)];
echo json_encode(['success'=>true, 'roll'=>$roll]);
