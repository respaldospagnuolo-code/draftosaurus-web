<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h2>Test APIs Draftosaurus</h2>";

// Test 1: ¿Existe config.php?
if (file_exists('config.php')) {
    echo "✅ config.php existe<br>";
    try {
        require_once 'config.php';
        echo "✅ config.php se carga correctamente<br>";
    } catch (Exception $e) {
        echo "❌ Error en config.php: " . $e->getMessage() . "<br>";
    }
} else {
    echo "❌ config.php NO existe<br>";
}

// Test 2: ¿Existen las APIs?
$apis = [
    'api/auth/login.php',
    'api/auth/register.php', 
    'api/game/create.php',
    'api/game/roll-dice.php',
    'api/game/start.php'
];

foreach ($apis as $api) {
    if (file_exists($api)) {
        echo "✅ $api existe<br>";
    } else {
        echo "❌ $api NO existe<br>";
    }
}

// Test 3: ¿Se puede conectar a la BD?
try {
    $pdo = new PDO("mysql:host=localhost;dbname=draftosaurus", "root", "");
    echo "✅ Conexión a BD exitosa<br>";
    
    // ¿Existe la tabla users?
    $stmt = $pdo->query("SHOW TABLES LIKE 'users'");
    if ($stmt->rowCount() > 0) {
        echo "✅ Tabla 'users' existe<br>";
        
        // ¿Cuántos usuarios hay?
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
        $count = $stmt->fetch()['count'];
        echo "📊 Usuarios en BD: $count<br>";
    } else {
        echo "❌ Tabla 'users' NO existe<br>";
    }
    
    // ¿Existen otras tablas necesarias?
    $tables = ['games', 'dinosaur_types', 'enclosures'];
    foreach ($tables as $table) {
        $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
        if ($stmt->rowCount() > 0) {
            echo "✅ Tabla '$table' existe<br>";
        } else {
            echo "❌ Tabla '$table' NO existe<br>";
        }
    }
    
} catch (PDOException $e) {
    echo "❌ Error BD: " . $e->getMessage() . "<br>";
}

echo "<br><h3>Test APIs individuales:</h3>";

// Test 4: Probar cada API manualmente
foreach ($apis as $api) {
    if (file_exists($api)) {
        echo "<strong>$api:</strong><br>";
        echo "<iframe src='$api' width='100%' height='100' style='border:1px solid #ccc; margin:5px 0;'></iframe><br>";
    }
}
?>