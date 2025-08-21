<?php
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['ok'=>true, 'user'=>['id'=>1,'nombre'=>'Demo']]);
