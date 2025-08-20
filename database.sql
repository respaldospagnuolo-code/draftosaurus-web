-- ==================== BASE DE DATOS DRAFTOSAURUS ==================== 

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS draftosaurus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE draftosaurus;

-- ==================== TABLA DE USUARIOS ==================== 
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    birthdate DATE NOT NULL,
    name VARCHAR(50) DEFAULT NULL,
    avatar VARCHAR(255) DEFAULT 'img/foto_usuario-1.png',
    games_won INT DEFAULT 0,
    games_lost INT DEFAULT 0,
    total_score INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_username (username),
    INDEX idx_email (email)
);

-- ==================== TABLA DE PARTIDAS ==================== 
CREATE TABLE games (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player1_id INT NOT NULL,
    player2_name VARCHAR(50) NOT NULL,
    player2_type ENUM('registered', 'guest') DEFAULT 'guest',
    player2_id INT DEFAULT NULL,
    current_round TINYINT DEFAULT 1,
    current_turn TINYINT DEFAULT 1,
    current_player TINYINT DEFAULT 1,
    game_state ENUM('waiting', 'in_progress', 'finished') DEFAULT 'waiting',
    winner_id INT DEFAULT NULL,
    player1_score INT DEFAULT 0,
    player2_score INT DEFAULT 0,
    dice_restriction TINYINT DEFAULT NULL,
    restricted_player TINYINT DEFAULT NULL,
    last_dice_roll TINYINT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP NULL,
    
    FOREIGN KEY (player1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (player2_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_player1 (player1_id),
    INDEX idx_player2 (player2_id),
    INDEX idx_game_state (game_state),
    INDEX idx_created_at (created_at)
);

-- ==================== TABLA DE TIPOS DE DINOSAURIOS ==================== 
CREATE TABLE dinosaur_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    icon VARCHAR(255) NOT NULL,
    color VARCHAR(7) DEFAULT '#000000',
    
    INDEX idx_name (name)
);

-- Insertar tipos de dinosaurios
INSERT INTO dinosaur_types (name, icon, color) VALUES
('Triceratops', 'img/dino-triceratops.png', '#4CAF50'),
('Brachiosaurus', 'img/dino-brachiosaurus.png', '#2196F3'),
('Stegosaurus', 'img/dino-stegosaurus.png', '#FF9800'),
('Parasaurolophus', 'img/dino-parasaurolophus.png', '#9C27B0'),
('Compsognathus', 'img/dino-compsognathus.png', '#795548'),
('T-Rex', 'img/dino-trex.png', '#F44336');

-- ==================== TABLA DE RECINTOS ==================== 
CREATE TABLE enclosures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    type ENUM('bosque_iguales', 'pradera_diferentes', 'pradera_amor', 'trio_bosque', 'rey_selva', 'isla_solitaria', 'rio') NOT NULL,
    capacity INT NOT NULL,
    zone ENUM('bosques', 'praderas', 'comidas', 'banos', 'rio') NOT NULL,
    scoring_rule TEXT,
    image VARCHAR(255),
    position_x INT DEFAULT 0,
    position_y INT DEFAULT 0,
    
    INDEX idx_type (type),
    INDEX idx_zone (zone)
);

-- Insertar recintos del tablero
INSERT INTO enclosures (name, type, capacity, zone, scoring_rule, image, position_x, position_y) VALUES
-- Bosques (banda superior)
('Bosque de Iguales 1', 'bosque_iguales', 4, 'bosques', 'Solo una especie. Puntos: 1+2+3+...+n', 'img/recinto-bosque-1.png', 0, 0),
('Bosque de Iguales 2', 'bosque_iguales', 6, 'bosques', 'Solo una especie. Puntos: 1+2+3+...+n', 'img/recinto-bosque-2.png', 1, 0),
('Trío del Bosque', 'trio_bosque', 3, 'bosques', '7 puntos si quedan exactamente 3 dinosaurios', 'img/recinto-trio.png', 2, 0),

-- Praderas (banda inferior)
('Pradera Diferentes 1', 'pradera_diferentes', 4, 'praderas', 'Todas especies distintas. Puntos: 1+2+3+...+n', 'img/recinto-pradera-1.png', 0, 2),
('Pradera Diferentes 2', 'pradera_diferentes', 5, 'praderas', 'Todas especies distintas. Puntos: 1+2+3+...+n', 'img/recinto-pradera-2.png', 1, 2),
('Pradera del Amor', 'pradera_amor', 6, 'praderas', '5 puntos por pareja de misma especie', 'img/recinto-amor.png', 2, 2),

-- Lado comidas (izquierda)
('Rey de la Selva', 'rey_selva', 1, 'comidas', '7 puntos si no tienes menos que tu rival de esa especie', 'img/recinto-rey.png', 0, 1),

-- Lado baños (derecha)
('Isla Solitaria', 'isla_solitaria', 1, 'banos', '7 puntos si es el único de su especie en todo tu zoo', 'img/recinto-isla.png', 2, 1),

-- Río (siempre disponible)
('Río', 'rio', 999, 'rio', '1 punto por dinosaurio', 'img/recinto-rio.png', 1, 1);

-- ==================== TABLA DE CONFIGURACIÓN DE DADOS ==================== 
CREATE TABLE dice_config (
    id TINYINT AUTO_INCREMENT PRIMARY KEY,
    face_number TINYINT NOT NULL UNIQUE,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    restriction_type ENUM('zone', 'empty', 'no_trex') NOT NULL,
    restriction_value VARCHAR(50),
    image VARCHAR(255) NOT NULL,
    
    INDEX idx_face (face_number)
);

-- Insertar configuración de caras del dado
INSERT INTO dice_config (face_number, title, description, restriction_type, restriction_value, image) VALUES
(1, 'Recinto vacío', 'Poné el dinosaurio en un lugar donde no haya ningún otro. Si no podés cumplir la consigna, poné el dinosaurio en el río.', 'empty', NULL, 'img/dado-1.png'),
(2, 'Sin T-Rex', 'Poné el dinosaurio en un lugar donde no esté el T-Rex. Si no podés cumplir la consigna, poné el dinosaurio en el río.', 'no_trex', NULL, 'img/dado-2.png'),
(3, 'Lado comidas (izquierda)', 'Poné el dinosaurio en el lado izquierdo del tablero, donde están las comidas. Si no podés cumplir la consigna, poné el dinosaurio en el río.', 'zone', 'comidas', 'img/dado-3.png'),
(4, 'Bosques', 'Poné el dinosaurio en un lugar del bosque. Si no podés cumplir la consigna, poné el dinosaurio en el río.', 'zone', 'bosques', 'img/dado-4.png'),
(5, 'Praderas', 'Poné el dinosaurio en un lugar de las praderas. Si no podés cumplir la consigna, poné el dinosaurio en el río.', 'zone', 'praderas', 'img/dado-5.png'),
(6, 'Lado baños (derecha)', 'Poné el dinosaurio en el lado derecho del tablero, donde están los baños. Si no podés cumplir la consigna, poné el dinosaurio en el río.', 'zone', 'banos', 'img/dado-6.png');

-- ==================== TABLA DE MANOS DE JUGADORES ==================== 
CREATE TABLE player_hands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_id INT NOT NULL,
    player_number TINYINT NOT NULL,
    round_number TINYINT NOT NULL,
    dinosaur_type_id INT NOT NULL,
    position_in_hand TINYINT NOT NULL,
    is_played BOOLEAN DEFAULT FALSE,
    played_at TIMESTAMP NULL,
    
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (dinosaur_type_id) REFERENCES dinosaur_types(id) ON DELETE CASCADE,
    
    INDEX idx_game_player_round (game_id, player_number, round_number),
    INDEX idx_is_played (is_played),
    UNIQUE KEY unique_hand_position (game_id, player_number, round_number, position_in_hand)
);

-- ==================== TABLA DE COLOCACIONES EN TABLERO ==================== 
CREATE TABLE board_placements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_id INT NOT NULL,
    player_number TINYINT NOT NULL,
    enclosure_id INT NOT NULL,
    dinosaur_type_id INT NOT NULL,
    round_number TINYINT NOT NULL,
    turn_number TINYINT NOT NULL,
    placement_order INT NOT NULL,
    dice_restriction TINYINT DEFAULT NULL,
    placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (enclosure_id) REFERENCES enclosures(id) ON DELETE CASCADE,
    FOREIGN KEY (dinosaur_type_id) REFERENCES dinosaur_types(id) ON DELETE CASCADE,
    FOREIGN KEY (dice_restriction) REFERENCES dice_config(face_number) ON DELETE SET NULL,
    
    INDEX idx_game_player (game_id, player_number),
    INDEX idx_enclosure (enclosure_id),
    INDEX idx_round_turn (round_number, turn_number),
    INDEX idx_placement_order (placement_order)
);

-- ==================== TABLA DE HISTORIAL DE DADOS ==================== 
CREATE TABLE dice_rolls (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_id INT NOT NULL,
    player_number TINYINT NOT NULL,
    round_number TINYINT NOT NULL,
    turn_number TINYINT NOT NULL,
    dice_result TINYINT NOT NULL,
    affects_player TINYINT NOT NULL,
    rolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (dice_result) REFERENCES dice_config(face_number) ON DELETE CASCADE,
    
    INDEX idx_game_round (game_id, round_number),
    INDEX idx_player_turn (player_number, turn_number)
);

-- ==================== TABLA DE PUNTUACIONES ==================== 
CREATE TABLE round_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_id INT NOT NULL,
    player_number TINYINT NOT NULL,
    round_number TINYINT NOT NULL,
    enclosure_id INT NOT NULL,
    base_score INT DEFAULT 0,
    bonus_score INT DEFAULT 0,
    total_score INT DEFAULT 0,
    calculation_detail TEXT,
    
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (enclosure_id) REFERENCES enclosures(id) ON DELETE CASCADE,
    
    INDEX idx_game_round (game_id, round_number),
    INDEX idx_player_round (player_number, round_number)
);

-- ==================== VISTA PARA ESTADÍSTICAS DE JUGADOR ==================== 
CREATE VIEW player_stats AS
SELECT 
    u.id,
    u.username,
    u.games_won,
    u.games_lost,
    (u.games_won + u.games_lost) as total_games,
    CASE 
        WHEN (u.games_won + u.games_lost) > 0 
        THEN ROUND((u.games_won * 100.0) / (u.games_won + u.games_lost), 2)
        ELSE 0 
    END as win_percentage,
    u.total_score,
    CASE 
        WHEN (u.games_won + u.games_lost) > 0 
        THEN ROUND(u.total_score / (u.games_won + u.games_lost), 2)
        ELSE 0 
    END as average_score
FROM users u;

-- ==================== VISTA PARA ESTADO ACTUAL DEL TABLERO ==================== 
CREATE VIEW current_board_state AS
SELECT 
    bp.game_id,
    bp.player_number,
    bp.enclosure_id,
    e.name as enclosure_name,
    e.type as enclosure_type,
    e.zone as enclosure_zone,
    e.capacity as enclosure_capacity,
    bp.dinosaur_type_id,
    dt.name as dinosaur_name,
    dt.icon as dinosaur_icon,
    bp.round_number,
    bp.turn_number,
    bp.placement_order,
    COUNT(*) OVER (PARTITION BY bp.game_id, bp.player_number, bp.enclosure_id) as dinosaurs_in_enclosure
FROM board_placements bp
JOIN enclosures e ON bp.enclosure_id = e.id
JOIN dinosaur_types dt ON bp.dinosaur_type_id = dt.id
ORDER BY bp.game_id, bp.player_number, bp.placement_order;

-- ==================== PROCEDIMIENTOS ALMACENADOS ==================== 

-- Procedimiento para crear una nueva partida
DELIMITER //
CREATE PROCEDURE CreateGame(
    IN p_player1_id INT,
    IN p_player2_name VARCHAR(50),
    IN p_player2_type ENUM('registered', 'guest'),
    IN p_player2_id INT
)
BEGIN
    DECLARE new_game_id INT;
    
    INSERT INTO games (player1_id, player2_name, player2_type, player2_id, game_state)
    VALUES (p_player1_id, p_player2_name, p_player2_type, p_player2_id, 'waiting');
    
    SET new_game_id = LAST_INSERT_ID();
    
    SELECT new_game_id as game_id, 'success' as status;
END //

-- Procedimiento para repartir dinosaurios
CREATE PROCEDURE DealDinosaurs(
    IN p_game_id INT,
    IN p_round_number TINYINT
)
BEGIN
    DECLARE i INT DEFAULT 1;
    DECLARE j INT DEFAULT 1;
    
    -- Limpiar manos anteriores de esta ronda
    DELETE FROM player_hands 
    WHERE game_id = p_game_id AND round_number = p_round_number;
    
    -- Repartir 6 dinosaurios a cada jugador
    WHILE i <= 2 DO
        SET j = 1;
        WHILE j <= 6 DO
            INSERT INTO player_hands (game_id, player_number, round_number, dinosaur_type_id, position_in_hand)
            VALUES (p_game_id, i, p_round_number, FLOOR(1 + RAND() * 6), j);
            SET j = j + 1;
        END WHILE;
        SET i = i + 1;
    END WHILE;
    
    SELECT 'success' as status;
END //

-- Procedimiento para calcular puntuación de un recinto
CREATE PROCEDURE CalculateEnclosureScore(
    IN p_game_id INT,
    IN p_player_number TINYINT,
    IN p_enclosure_id INT,
    OUT p_score INT
)
BEGIN
    DECLARE enclosure_type_var VARCHAR(50);
    DECLARE dino_count INT DEFAULT 0;
    DECLARE species_count INT DEFAULT 0;
    DECLARE trex_count INT DEFAULT 0;
    
    -- Obtener tipo de recinto
    SELECT type INTO enclosure_type_var 
    FROM enclosures 
    WHERE id = p_enclosure_id;
    
    -- Contar dinosaurios en el recinto
    SELECT COUNT(*) INTO dino_count
    FROM board_placements bp
    WHERE bp.game_id = p_game_id 
    AND bp.player_number = p_player_number 
    AND bp.enclosure_id = p_enclosure_id;
    
    -- Contar especies diferentes
    SELECT COUNT(DISTINCT dinosaur_type_id) INTO species_count
    FROM board_placements bp
    WHERE bp.game_id = p_game_id 
    AND bp.player_number = p_player_number 
    AND bp.enclosure_id = p_enclosure_id;
    
    -- Contar T-Rex
    SELECT COUNT(*) INTO trex_count
    FROM board_placements bp
    JOIN dinosaur_types dt ON bp.dinosaur_type_id = dt.id
    WHERE bp.game_id = p_game_id 
    AND bp.player_number = p_player_number 
    AND bp.enclosure_id = p_enclosure_id
    AND dt.name = 'T-Rex';
    
    -- Calcular puntuación según tipo de recinto
    CASE enclosure_type_var
        WHEN 'bosque_iguales' THEN
            IF species_count = 1 THEN
                SET p_score = (dino_count * (dino_count + 1)) / 2;
            ELSE
                SET p_score = 0;
            END IF;
            
        WHEN 'pradera_diferentes' THEN
            IF species_count = dino_count THEN
                SET p_score = (dino_count * (dino_count + 1)) / 2;
            ELSE
                SET p_score = 0;
            END IF;
            
        WHEN 'pradera_amor' THEN
            -- Calcular parejas (lógica compleja, simplificada aquí)
            SET p_score = dino_count; -- Simplificado
            
        WHEN 'trio_bosque' THEN
            IF dino_count = 3 THEN
                SET p_score = 7;
            ELSE
                SET p_score = 0;
            END IF;
            
        WHEN 'rey_selva' THEN
            IF dino_count = 1 THEN
                SET p_score = 7; -- Simplificado, falta comparar con rival
            ELSE
                SET p_score = 0;
            END IF;
            
        WHEN 'isla_solitaria' THEN
            IF dino_count = 1 THEN
                SET p_score = 7; -- Simplificado, falta verificar que sea único
            ELSE
                SET p_score = 0;
            END IF;
            
        WHEN 'rio' THEN
            SET p_score = dino_count;
            
        ELSE
            SET p_score = 0;
    END CASE;
    
    -- Bonus por T-Rex
    SET p_score = p_score + trex_count;
    
END //

DELIMITER ;

-- ==================== TRIGGERS ==================== 

-- Trigger para actualizar estadísticas al finalizar partida
DELIMITER //
CREATE TRIGGER update_player_stats AFTER UPDATE ON games
FOR EACH ROW
BEGIN
    IF NEW.game_state = 'finished' AND OLD.game_state != 'finished' THEN
        -- Actualizar estadísticas del jugador 1
        IF NEW.winner_id = NEW.player1_id THEN
            UPDATE users SET games_won = games_won + 1, total_score = total_score + NEW.player1_score 
            WHERE id = NEW.player1_id;
        ELSE
            UPDATE users SET games_lost = games_lost + 1, total_score = total_score + NEW.player1_score 
            WHERE id = NEW.player1_id;
        END IF;
        
        -- Actualizar estadísticas del jugador 2 (si es usuario registrado)
        IF NEW.player2_id IS NOT NULL THEN
            IF NEW.winner_id = NEW.player2_id THEN
                UPDATE users SET games_won = games_won + 1, total_score = total_score + NEW.player2_score 
                WHERE id = NEW.player2_id;
            ELSE
                UPDATE users SET games_lost = games_lost + 1, total_score = total_score + NEW.player2_score 
                WHERE id = NEW.player2_id;
            END IF;
        END IF;
    END IF;
END //

DELIMITER ;

-- ==================== DATOS DE EJEMPLO ==================== 

-- Usuario de prueba
INSERT INTO users (username, email, password_hash, birthdate, name) VALUES
('testuser', 'test@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '1990-01-01', 'Usuario de Prueba');

-- ==================== ÍNDICES ADICIONALES PARA PERFORMANCE ==================== 

CREATE INDEX idx_games_active ON games (game_state, current_player);
CREATE INDEX idx_placements_game_player_enclosure ON board_placements (game_id, player_number, enclosure_id);
CREATE INDEX idx_hands_available ON player_hands (game_id, player_number, round_number, is_played);


