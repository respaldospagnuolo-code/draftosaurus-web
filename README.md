# Draftosaurus - Juego Web

## Descripción
Draftosaurus es una aplicación web que digitaliza el popular juego de mesa de dinosaurios. Los jugadores colocan dinosaurios en recintos de su zoológico siguiendo las restricciones del dado.

## Estructura del Proyecto

```
draftosaurus/
├── index.html              # Página principal
├── app.js                  # JavaScript del frontend (solo UI)
├── estilos.css            # Estilos CSS
├── config.php             # Configuración de base de datos
├── database.sql           # Script de base de datos
├── api/
│   ├── auth/
│   │   ├── login.php      # API de login
│   │   └── register.php   # API de registro
│   └── game/
│       ├── create.php     # Crear partida
│       ├── roll-dice.php  # Lanzar dado
│       ├── start.php      # Iniciar partida
│       ├── place-dinosaur.php # Colocar dinosaurio
│       └── state.php      # Estado del juego
├── img/                   # Imágenes del juego
└── logs/                  # Archivos de log (se crea automáticamente)
```

## Características

### Frontend (JavaScript)
- **Manejo de estados de pantallas**: Login, registro, lobby, configuración de jugadores, dado, partida
- **Validación de formularios**: Campos requeridos, formatos válidos
- **Sistema de toasts**: Notificaciones de éxito, error e información
- **Animaciones**: Dado giratorio, transiciones de pantalla
- **Interfaz responsive**: Adaptable a móviles y escritorio
- **PWA support**: Service Worker para funcionalidad offline

### Backend (PHP)
- **Sistema de autenticación**: Registro y login seguro con hash de contraseñas
- **Gestión de sesiones**: Manejo seguro de sesiones de usuario
- **Lógica del juego**: Validación de reglas, cálculo de puntuaciones
- **Base de datos MySQL**: Estructura completa para usuarios, partidas, colocaciones
- **API REST**: Endpoints para todas las operaciones del juego
- **Logs de actividad**: Registro de acciones y errores

### Base de Datos
- **Usuarios**: Información de jugadores y estadísticas
- **Partidas**: Estado del juego, rondas, turnos
- **Tablero**: Colocaciones de dinosaurios en recintos
- **Dados**: Historial de lanzamientos y restricciones
- **Puntuaciones**: Cálculo de puntos por ronda y final

## Instalación

### 1. Requisitos
- PHP 7.4 o superior
- MySQL 5.7 o superior
- Servidor web (Apache/Nginx)
- Extensiones PHP: PDO, PDO_MySQL, mbstring

### 2. Configurar Base de Datos
```sql
-- Crear base de datos
CREATE DATABASE draftosaurus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Importar estructura
mysql -u root -p draftosaurus < database.sql
```

### 3. Configurar PHP
Editar `config.php` con tus credenciales de base de datos:

```php
const DB_HOST = 'localhost';
const DB_NAME = 'draftosaurus';
const DB_USER = 'tu_usuario';
const DB_PASS = 'tu_contraseña';
```

### 4. Permisos
```bash
# Crear directorio de logs
mkdir logs
chmod 755 logs

# Permisos de archivos
chmod 644 *.php *.html *.css *.js
chmod 755 api/ api/auth/ api/game/
```

### 5. Configurar Servidor Web

#### Apache (.htaccess)
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^api/(.*)$ api/$1 [L]

# Headers de seguridad
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"
```

#### Nginx
```nginx
location /api/ {
    try_files $uri $uri/ =404;
}

location ~ \.php$ {
    fastcgi_pass unix:/var/run/php/php7.4-fpm.sock;
    fastcgi_index index.php;
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
}
```

## Uso

### 1. Registro y Login
- Los usuarios se registran con username, email, fecha de nacimiento y contraseña
- Sistema de validación completo (edad mínima, formatos, etc.)
- Contraseñas hasheadas con Argon2ID

### 2. Crear Partida
- Jugador 1 (registrado) vs Jugador 2 (registrado o invitado)
- El sistema crea la partida y reparte 6 dinosaurios aleatorios

### 3. Mecánica del Juego
- **2 rondas** de 6 dinosaurios cada una
- **Flujo por ronda**:
  1. J1 lanza dado → restricción para J2
  2. J1 coloca sin restricción (solo primera colocación)
  3. J2 coloca con restricción → J2 lanza dado → restricción para J1
  4. Alternancia: colocar → lanzar dado hasta terminar manos
- **Reglas de colocación**:
  - Capacidad del recinto
  - Zona bloqueada por dado
  - Reglas específicas del recinto
  - Río siempre disponible como fallback

### 4. Tipos de Recinto
- **Bosque de Iguales**: Solo una especie, puntos progresivos (1+2+3+...+n)
- **Pradera Diferentes**: Todas especies distintas, puntos progresivos
- **Pradera del Amor**: Sin restricción, 5 puntos por pareja
- **Trío del Bosque**: Máximo 3, 7 puntos si quedan exactamente 3
- **Rey de la Selva**: 1 espacio, 7 puntos si no tienes menos que rival
- **Isla Solitaria**: 1 espacio, 7 puntos si es único en tu zoo
- **Río**: Siempre legal, 1 punto por dinosaurio

## API Endpoints

### Autenticación
```
POST /api/auth/login.php
- Body: {"username": "user", "password": "pass"}
- Response: {"success": true, "user": {...}}

POST /api/auth/register.php
- Body: {"username": "user", "email": "email", "birthdate": "1990-01-01", "password": "pass", "passwordConfirm": "pass"}
- Response: {"success": true, "user": {...}}
```

### Juego
```
POST /api/game/create.php
- Body: {"player1": {...}, "player2": {"name": "Player2", "type": "guest"}}
- Response: {"success": true, "game": {...}}

POST /api/game/roll-dice.php
- Body: {"game_id": 123}
- Response: {"success": true, "dice_result": 4, "dice_config": {...}}

POST /api/game/start.php
- Body: {"game_id": 123}
- Response: {"success": true, "game_state": {...}}

POST /api/game/place-dinosaur.php
- Body: {"game_id": 123, "enclosure_id": 5, "dinosaur_type_id": 2, "hand_position": 1}
- Response: {"success": true, "placement_successful": true, ...}

GET /api/game/state.php?game_id=123
- Response: {"success": true, "game_state": {...}}
```

## Configuración de Desarrollo

### Debug Mode
En `config.php`, cambiar:
```php
define('DEBUG', true); // Para desarrollo
```

Esto habilita:
- Mensajes de error detallados
- CORS permisivo
- Logs más verbosos

### Logs
Los archivos de log se guardan en:
- `logs/php_errors.log` - Errores de PHP
- Logs de aplicación via `Utils::logError()` y `Utils::logActivity()`

### Base de Datos de Prueba
El script incluye un usuario de prueba:
- **Username**: testuser
- **Password**: password
- **Email**: test@example.com

## Seguridad

### Medidas Implementadas
- **Contraseñas hasheadas** con Argon2ID
- **Sesiones seguras** con configuración de cookies
- **Validación de entrada** y sanitización
- **Headers de seguridad** (XSS, CSRF, etc.)
- **Consultas preparadas** para prevenir SQL injection
- **Logs de actividad** para auditoría

### Headers de Seguridad
```php
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

## Arquitectura

### Separación de Responsabilidades
- **Frontend (app.js)**: Solo interfaz de usuario, animaciones, validación de formularios
- **Backend (PHP)**: Lógica de negocio, autenticación, reglas del juego
- **Base de datos**: Persistencia, procedimientos almacenados, triggers

### Patrón de Diseño
- **Singleton** para conexión de base de datos
- **Factory** para respuestas API
- **MVC** implícito (Model=BD, View=Frontend, Controller=APIs)

### Escalabilidad
- **Procedimientos almacenados** para lógica compleja
- **Índices optimizados** para consultas frecuentes
- **Paginación** preparada para listas grandes
- **Cache** de sesiones y configuración

## Resolución de Problemas

### Errores Comunes

#### Error de conexión a BD
```
Error: Database connection failed
```
**Solución**: Verificar credenciales en `config.php` y que MySQL esté ejecutándose

#### Error 500 en APIs
```
Error interno del servidor
```
**Solución**: Revisar `logs/php_errors.log` para detalles específicos

#### Problemas de permisos
```
Warning: file_put_contents(): Permission denied
```
**Solución**: 
```bash
chmod 755 logs/
chmod 644 logs/*.log
```

#### CORS en desarrollo
```
Access to fetch at 'api/...' blocked by CORS policy
```
**Solución**: Activar `DEBUG=true` en `config.php` o configurar CORS apropiadamente

### Testing

#### Pruebas Manuales
1. Registro de usuario nuevo
2. Login con credenciales correctas/incorrectas
3. Crear partida con jugador invitado/registrado
4. Lanzar dado y verificar restricciones
5. Colocar dinosaurios respetando reglas
6. Completar partida y verificar puntuaciones

#### Datos de Prueba
```sql
-- Insertar usuarios de prueba
INSERT INTO users (username, email, password_hash, birthdate, name) VALUES
('jugador1', 'j1@test.com', '$2y$10$hash1', '1985-01-01', 'Jugador Uno'),
('jugador2', 'j2@test.com', '$2y$10$hash2', '1990-01-01', 'Jugador Dos');

-- Verificar estructura de tablas
SHOW TABLES;
DESCRIBE users;
DESCRIBE games;
```

## Deployment

### Producción
1. **Cambiar configuración**:
   ```php
   define('DEBUG', false);
   ```

2. **Configurar HTTPS**:
   ```php
   'secure' => true, // En cookies de sesión
   ```

3. **Optimizar base de datos**:
   ```sql
   OPTIMIZE TABLE users, games, board_placements;
   ```

4. **Backup automático**:
   ```bash
   # Cron job diario
   0 2 * * * mysqldump -u user -p draftosaurus > /backup/draftosaurus_$(date +\%Y\%m\%d).sql
   ```

### Mantenimiento
- **Limpiar logs** periódicamente
- **Optimizar tablas** mensualmente
- **Backup de BD** diario
- **Monitorear espacio** en disco
- **Actualizar dependencias** de PHP

## Contribución

### Agregar Nuevas Características
1. **Frontend**: Modificar `app.js` para nuevas pantallas/funcionalidades
2. **Backend**: Crear nuevos endpoints en `/api/`
3. **Base de datos**: Actualizar `database.sql` con nuevas tablas/campos
4. **Documentar** cambios en este README

### Estructura de Commits
```
feat: agregar nueva funcionalidad
fix: corregir bug
docs: actualizar documentación
style: cambios de formato
refactor: reestructurar código
test: agregar pruebas
```

## Licencia
Este proyecto es de código abierto. Ver LICENSE para más detalles.

## Soporte
Para reportar bugs o solicitar características, crear un issue en el repositorio del proyecto.