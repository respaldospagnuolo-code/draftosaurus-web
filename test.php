<?php
require_once 'config.php';

try {
    $db = Database::getInstance()->getConnection();
    echo "✅ Conexión a base de datos exitosa\n";
    
    // Verificar si existe la tabla users
    $stmt = $db->query("SHOW TABLES LIKE 'users'");
    if ($stmt->rowCount() > 0) {
        echo "✅ Tabla 'users' existe\n";
        
        // Contar usuarios
        $stmt = $db->query("SELECT COUNT(*) as count FROM users");
        $result = $stmt->fetch();
        echo "📊 Total de usuarios: " . $result['count'] . "\n";
        
    } else {
        echo "❌ Tabla 'users' no existe\n";
        echo "💡 Ejecuta: mysql -u root -p draftosaurus < database.sql\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error de conexión: " . $e->getMessage() . "\n";
    
    if (strpos($e->getMessage(), 'Unknown database') !== false) {
        echo "💡 La base de datos no existe. Créala con:\n";
        echo "   mysql -u root -p -e \"CREATE DATABASE draftosaurus;\"\n";
    }
}
?>