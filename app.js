// ==================== SISTEMA DE MANEJO DE ESTADOS - ACTUALIZADO ==================== 
class AppState {
    constructor() {
        this.currentScreen = 'carga';
        this.user = null;
        this.loading = false;
        this.gameSession = null;
        this.dadoSeleccionado = null;
        this.currentPlayer = 1;
        this.currentRound = 1;
        this.diceRestriction = null;
        
        // Estado del tablero
        this.boardState = {
            player1Hand: [],
            player2Hand: [],
            player1Board: {},
            player2Board: {},
            player1Score: 0,
            player2Score: 0,
            round1Scores: { player1: 0, player2: 0 },
            round2Scores: { player1: 0, player2: 0 }
        };
        
        // Configuración del juego
        this.gameConfig = {
            ENCLOSURES: {
                1: { name: 'Pradera Progresiva', position: [0, 0], maxCapacity: 6, type: 'pradera' },
                2: { name: 'Trío del Bosque', position: [1, 0], maxCapacity: 3, type: 'bosque' },
                3: { name: 'Pradera del Amor', position: [2, 0], maxCapacity: 6, type: 'pradera' },
                4: { name: 'Rey de la Selva', position: [0, 2], maxCapacity: 1, type: 'rocas' },
                5: { name: 'Cine/Comida', position: [1, 2], maxCapacity: 6, type: 'comida' },
                6: { name: 'Baños', position: [2, 2], maxCapacity: 1, type: 'baños' },
                7: { name: 'Río', position: [1, 1], maxCapacity: 999, type: 'rio' }
            },
            DICE_RESTRICTIONS: {
                1: 'baños', // Adyacente a baño
                2: 'huella', // Recinto con al menos 1 dinosaurio
                3: 'no_trex', // Sin T-Rex
                4: 'cafe', // Adyacente a cafetería
                5: 'bosque', // Zona boscosa
                6: 'rocas' // Zona rocosa
            },
            DINOSAUR_TYPES: ['T-Rex', 'Triceratops', 'Stegosaurus', 'Velociraptor', 'Diplodocus', 'Parasaurolophus'],
            POINTS_RULES: {
                'pradera_progresiva': [0, 2, 4, 8, 12, 18, 24],
                'trio_bosque': [0, 2, 5, 7, 7, 7, 7],
                'amor': [0, 0, 5, 5, 10, 10, 15],
                'rey': [7],
                'comida': [0, 1, 3, 6, 10, 15, 21],
                'baños': [7],
                'rio': [0, 0, 0, 0, 0, 0, 0]
            }
        };
        
        // Sistema de drag and drop
        this.dragState = {
            isDragging: false,
            draggedElement: null,
            draggedDino: null,
            validTargets: [],
            startPosition: null
        };
        
        // Sistema de debug
        this.debug = {
            enabled: false,
            logs: [],
            startTime: Date.now()
        };
        
        this.initializeEventListeners();
    }

    // ==================== INICIALIZACIÓN ==================== 
    initializeEventListeners() {
        // Eventos globales
        document.addEventListener('DOMContentLoaded', () => this.init());
        window.addEventListener('beforeunload', (e) => this.handleBeforeUnload(e));
        window.addEventListener('error', (e) => this.handleGlobalError(e));
        window.addEventListener('unhandledrejection', (e) => this.handleUnhandledPromise(e));
        
        // Eventos de visibilidad
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveGameState();
            } else {
                this.loadGameState();
            }
        });
        
        // Atajos de teclado
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    async init() {
        console.log('🦕 Iniciando Draftosaurus...');
        this.showScreen('carga');
        
        try {
            // Verificar sesión existente
            await this.checkExistingSession();
            
            // Cargar configuración
            await this.loadGameConfiguration();
            
            // Inicializar PWA
            this.initializePWA();
            
            // Mostrar pantalla de login
            this.showScreen('login');
            
            console.log('✅ Draftosaurus iniciado correctamente');
        } catch (error) {
            console.error('❌ Error al iniciar:', error);
            this.showToast('Error al inicializar el juego', 'error');
        }
    }

    // ==================== MANEJO DE PANTALLAS ==================== 
    showScreen(screenName) {
        console.log(`📱 Mostrando pantalla: ${screenName}`);
        
        // Ocultar todas las pantallas
        const screens = document.querySelectorAll('.pantalla');
        screens.forEach(screen => {
            screen.classList.remove('active');
            screen.style.display = 'none';
        });
        
        // Mostrar pantalla específica
        const targetScreen = document.getElementById(`pantalla-${screenName}`);
        if (targetScreen) {
            targetScreen.style.display = 'flex';
            setTimeout(() => {
                targetScreen.classList.add('active');
            }, 50);
        }
        
        this.currentScreen = screenName;
        
        // Configurar pantalla específica
        this.configureScreen(screenName);
    }

    configureScreen(screenName) {
        switch (screenName) {
            case 'login':
                this.setupLoginScreen();
                break;
            case 'register':
                this.setupRegisterScreen();
                break;
            case 'lobby':
                this.setupLobbyScreen();
                break;
            case 'partida':
                this.setupGameScreen();
                break;
            case 'resumen-ronda':
                this.setupRoundSummaryScreen();
                break;
            case 'final':
                this.setupFinalScreen();
                break;
        }
    }

    // ==================== CONFIGURACIÓN DE PANTALLAS ESPECÍFICAS ==================== 
    setupLoginScreen() {
        const form = document.getElementById('login-form');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const loginBtn = document.getElementById('login-btn');
        const registerLink = document.getElementById('register-link');
        
        if (form) {
            form.onsubmit = (e) => this.handleLogin(e);
        }
        
        if (registerLink) {
            registerLink.onclick = (e) => {
                e.preventDefault();
                this.showScreen('register');
            };
        }
        
        // Auto-focus en email
        if (emailInput) {
            emailInput.focus();
        }
    }

    setupRegisterScreen() {
        const form = document.getElementById('register-form');
        const loginLink = document.getElementById('login-link');
        
        if (form) {
            form.onsubmit = (e) => this.handleRegister(e);
        }
        
        if (loginLink) {
            loginLink.onclick = (e) => {
                e.preventDefault();
                this.showScreen('login');
            };
        }
    }

    setupLobbyScreen() {
        const newGameBtn = document.getElementById('new-game-btn');
        const logoutBtn = document.getElementById('logout-btn');
        
        if (newGameBtn) {
            newGameBtn.onclick = () => this.startNewGame();
        }
        
        if (logoutBtn) {
            logoutBtn.onclick = () => this.logout();
        }
        
        // Mostrar información del usuario
        this.updateUserInfo();
    }

    setupGameScreen() {
        console.log('🎮 Configurando pantalla de juego...');
        
        // Inicializar tablero
        this.initializeBoard();
        
        // Configurar drag and drop
        this.setupDragAndDrop();
        
        // Configurar botones
        this.setupGameButtons();
        
        // Cargar estado del juego
        this.loadGameState();
        
        // Actualizar interfaz
        this.updateGameInterface();
    }

    setupRoundSummaryScreen() {
        const nextRoundBtn = document.getElementById('next-round-btn');
        
        if (nextRoundBtn) {
            nextRoundBtn.onclick = () => this.startNextRound();
        }
        
        this.displayRoundSummary();
    }

    setupFinalScreen() {
        const newGameBtn = document.getElementById('final-new-game-btn');
        const lobbyBtn = document.getElementById('final-lobby-btn');
        
        if (newGameBtn) {
            newGameBtn.onclick = () => this.startNewGame();
        }
        
        if (lobbyBtn) {
            lobbyBtn.onclick = () => this.showScreen('lobby');
        }
        
        this.displayFinalResults();
    }
    // ==================== AUTENTICACIÓN ==================== 
    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        if (!this.validateEmail(email)) {
            this.showToast('Email inválido', 'error');
            return;
        }
        
        if (password.length < 6) {
            this.showToast('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }
        
        this.setLoading(true);
        
        try {
            const response = await fetch('api/auth/login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.user = data.user;
                this.showToast('¡Bienvenido!', 'success');
                this.showScreen('lobby');
                this.saveUserSession();
            } else {
                this.showToast(data.message || 'Error al iniciar sesión', 'error');
            }
        } catch (error) {
            console.error('Error en login:', error);
            this.showToast('Error de conexión', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        
        // Validaciones
        if (username.length < 3) {
            this.showToast('El nombre de usuario debe tener al menos 3 caracteres', 'error');
            return;
        }
        
        if (!this.validateEmail(email)) {
            this.showToast('Email inválido', 'error');
            return;
        }
        
        if (password.length < 6) {
            this.showToast('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showToast('Las contraseñas no coinciden', 'error');
            return;
        }
        
        this.setLoading(true);
        
        try {
            const response = await fetch('api/auth/register.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showToast('¡Cuenta creada exitosamente!', 'success');
                this.showScreen('login');
                // Pre-llenar el email
                document.getElementById('email').value = email;
            } else {
                this.showToast(data.message || 'Error al registrar usuario', 'error');
            }
        } catch (error) {
            console.error('Error en registro:', error);
            this.showToast('Error de conexión', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async checkExistingSession() {
        const savedUser = localStorage.getItem('draftosaurus_user');
        if (savedUser) {
            try {
                this.user = JSON.parse(savedUser);
                // Verificar si la sesión sigue siendo válida
                const response = await fetch('verify-session.php');
                const data = await response.json();
                
                if (data.valid) {
                    this.showScreen('lobby');
                } else {
                    localStorage.removeItem('draftosaurus_user');
                    this.user = null;
                }
            } catch (error) {
                console.error('Error verificando sesión:', error);
                localStorage.removeItem('draftosaurus_user');
                this.user = null;
            }
        }
    }

    saveUserSession() {
        if (this.user) {
            localStorage.setItem('draftosaurus_user', JSON.stringify(this.user));
        }
    }

    logout() {
        this.user = null;
        this.gameSession = null;
        localStorage.removeItem('draftosaurus_user');
        localStorage.removeItem('draftosaurus_game_state');
        this.showToast('Sesión cerrada', 'info');
        this.showScreen('login');
    }

    // ==================== GESTIÓN DEL JUEGO ==================== 
    async startNewGame() {
        console.log('🎮 Iniciando nueva partida...');
        
        this.setLoading(true);
        
        try {
            // Configurar jugadores (juego local)
            const player1Name = prompt('Nombre del Jugador 1:') || 'Jugador 1';
            const player2Name = prompt('Nombre del Jugador 2:') || 'Jugador 2';
            
            // Crear sesión de juego
            const response = await fetch('api/game/start.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    player1_name: player1Name,
                    player2_name: player2Name,
                    game_mode: 'local'
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.gameSession = {
                    id: data.game_id,
                    player1: { id: 1, name: player1Name },
                    player2: { id: 2, name: player2Name }
                };
                
                // Inicializar estado del juego
                this.resetGameState();
                
                // Lanzar dado inicial
                await this.rollDiceAndStart();
                
            } else {
                this.showToast(data.message || 'Error al crear partida', 'error');
            }
        } catch (error) {
            console.error('Error creando partida:', error);
            this.showToast('Error al crear partida', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    resetGameState() {
        this.currentPlayer = 1;
        this.currentRound = 1;
        this.diceRestriction = null;
        
        this.boardState = {
            player1Hand: [],
            player2Hand: [],
            player1Board: {},
            player2Board: {},
            player1Score: 0,
            player2Score: 0,
            round1Scores: { player1: 0, player2: 0 },
            round2Scores: { player1: 0, player2: 0 }
        };
        
        // Repartir dinosaurios para la primera ronda
        this.dealDinosaurs();
    }

    async dealDinosaurs() {
        try {
            const response = await fetch('api/game/deal-dinosaurs.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    game_id: this.gameSession.id,
                    round: this.currentRound
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.boardState.player1Hand = data.player1_hand;
                this.boardState.player2Hand = data.player2_hand;
                console.log('🦕 Dinosaurios repartidos:', data);
            } else {
                throw new Error(data.message || 'Error al repartir dinosaurios');
            }
        } catch (error) {
            console.error('Error repartiendo dinosaurios:', error);
            this.showToast('Error al repartir dinosaurios', 'error');
        }
    }

    async rollDiceAndStart() {
        // Mostrar animación de dado
        await this.showDiceAnimation();
        
        // Ir a la pantalla de juego
        this.showScreen('partida');
    }

    async showDiceAnimation() {
        return new Promise((resolve) => {
            // Crear overlay de animación
            const overlay = document.createElement('div');
            overlay.className = 'dice-animation-overlay';
            overlay.innerHTML = `
                <div class="dice-container">
                    <div class="dice-cube" id="dice-cube">
                        <div class="dice-face dice-face-1">
                            <img src="img/dado-baños.png" alt="Baños">
                        </div>
                        <div class="dice-face dice-face-2">
                            <img src="img/dado-huella.png" alt="Huella">
                        </div>
                        <div class="dice-face dice-face-3">
                            <img src="img/dado-no-trex.png" alt="No T-Rex">
                        </div>
                        <div class="dice-face dice-face-4">
                            <img src="img/dado-cafe.png" alt="Café">
                        </div>
                        <div class="dice-face dice-face-5">
                            <img src="img/dado-bosque.png" alt="Bosque">
                        </div>
                        <div class="dice-face dice-face-6">
                            <img src="img/dado-rocas.png" alt="Rocas">
                        </div>
                    </div>
                    <p class="dice-text">Lanzando dado...</p>
                </div>
            `;
            
            document.body.appendChild(overlay);
            
            // Animación de rotación
            const cube = document.getElementById('dice-cube');
            cube.style.animation = 'diceSpin 2s ease-out';
            
            setTimeout(() => {
                // Generar resultado del dado (1-6)
                const diceResult = Math.floor(Math.random() * 6) + 1;
                this.diceRestriction = this.gameConfig.DICE_RESTRICTIONS[diceResult];
                
                // Mostrar resultado
                cube.style.transform = this.getDiceTransform(diceResult);
                document.querySelector('.dice-text').textContent = `Restricción: ${this.getRestrictionText(this.diceRestriction)}`;
                
                setTimeout(() => {
                    document.body.removeChild(overlay);
                    resolve();
                }, 1500);
            }, 2000);
        });
    }

    getDiceTransform(face) {
        const transforms = {
            1: 'rotateX(0deg) rotateY(0deg)',
            2: 'rotateX(0deg) rotateY(90deg)',
            3: 'rotateX(0deg) rotateY(180deg)',
            4: 'rotateX(0deg) rotateY(-90deg)',
            5: 'rotateX(90deg) rotateY(0deg)',
            6: 'rotateX(-90deg) rotateY(0deg)'
        };
        return transforms[face] || transforms[1];
    }

    getRestrictionText(restriction) {
        const texts = {
            'baños': 'Adyacente a baño',
            'huella': 'Recinto con dinosaurios',
            'no_trex': 'Sin T-Rex',
            'cafe': 'Adyacente a cafetería',
            'bosque': 'Zona boscosa',
            'rocas': 'Zona rocosa'
        };
        return texts[restriction] || 'Sin restricción';
    }

    // ==================== CONFIGURACIÓN DEL TABLERO ==================== 
    initializeBoard() {
        console.log('🏗️ Inicializando tablero...');
        
        const board = document.getElementById('tablero');
        if (!board) {
            console.error('❌ No se encontró el elemento tablero');
            return;
        }
        
        // Limpiar tablero
        board.innerHTML = '';
        
        // Crear estructura 3x3
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                if (row === 1 && col === 1) {
                    // Río en el centro
                    this.createEnclosureElement(7, board);
                } else {
                    // Recintos
                    const enclosureId = this.getEnclosureIdByPosition(row, col);
                    if (enclosureId) {
                        this.createEnclosureElement(enclosureId, board);
                    }
                }
            }
        }
        
        console.log('✅ Tablero inicializado');
    }

    getEnclosureIdByPosition(row, col) {
        const positionMap = {
            '0,0': 1, // Pradera Progresiva
            '0,1': null, // Vacío
            '0,2': 4, // Rey de la Selva
            '1,0': 2, // Trío del Bosque
            '1,1': 7, // Río (manejado arriba)
            '1,2': 5, // Cine/Comida
            '2,0': 3, // Pradera del Amor
            '2,1': null, // Vacío
            '2,2': 6  // Baños
        };
        return positionMap[`${row},${col}`];
    }

    createEnclosureElement(enclosureId, container) {
        const enclosure = this.gameConfig.ENCLOSURES[enclosureId];
        if (!enclosure) return;
        
        const element = document.createElement('div');
        element.className = `recinto recinto-${enclosureId}`;
        element.dataset.enclosureId = enclosureId;
        element.dataset.enclosureName = enclosure.name;
        element.dataset.enclosureType = enclosure.type;
        
        // Imagen de fondo del recinto
        element.style.backgroundImage = `url('img/recinto-${enclosureId}.jpg')`;
        element.style.backgroundSize = 'contain';
        element.style.backgroundRepeat = 'no-repeat';
        element.style.backgroundPosition = 'center';
        
        // Contenedor para dinosaurios
        const dinoContainer = document.createElement('div');
        dinoContainer.className = 'dinosaur-container';
        element.appendChild(dinoContainer);
        
        // Información del recinto
        const info = document.createElement('div');
        info.className = 'recinto-info';
        info.innerHTML = `
            <span class="recinto-name">${enclosure.name}</span>
            <span class="recinto-capacity">0/${enclosure.maxCapacity}</span>
        `;
        element.appendChild(info);
        
        container.appendChild(element);
    }
    // ==================== SISTEMA DE DRAG AND DROP ==================== 
    setupDragAndDrop() {
        console.log('🖱️ Configurando drag and drop...');
        
        // Configurar elementos draggables (dinosaurios en mano)
        this.updateDraggableElements();
        
        // Configurar drop zones (recintos)
        this.setupDropZones();
    }

    updateDraggableElements() {
        const currentHand = this.currentPlayer === 1 ? this.boardState.player1Hand : this.boardState.player2Hand;
        const handContainer = document.getElementById('player-hand');
        
        if (!handContainer) return;
        
        // Limpiar mano
        handContainer.innerHTML = '';
        
        // Añadir dinosaurios
        currentHand.forEach((dino, index) => {
            const dinoElement = this.createDinosaurElement(dino, index);
            handContainer.appendChild(dinoElement);
        });
    }

    createDinosaurElement(dino, position) {
        const element = document.createElement('div');
        element.className = 'dinosaur-card';
        element.draggable = true;
        element.dataset.dinoType = dino.type;
        element.dataset.position = position;
        
        element.innerHTML = `
            <img src="img/dino-${dino.type.toLowerCase()}.png" alt="${dino.type}">
            <span class="dino-name">${dino.type}</span>
        `;
        
        // Eventos de drag
        element.addEventListener('dragstart', (e) => this.handleDragStart(e));
        element.addEventListener('dragend', (e) => this.handleDragEnd(e));
        
        // Eventos touch para móviles
        element.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        element.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        element.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        
        return element;
    }

    setupDropZones() {
        const recintos = document.querySelectorAll('.recinto');
        
        recintos.forEach(recinto => {
            recinto.addEventListener('dragover', (e) => this.handleDragOver(e));
            recinto.addEventListener('drop', (e) => this.handleDrop(e));
            recinto.addEventListener('dragenter', (e) => this.handleDragEnter(e));
            recinto.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        });
    }

    handleDragStart(e) {
        console.log('🟡 Iniciando drag...');
        
        this.dragState.isDragging = true;
        this.dragState.draggedElement = e.target;
        this.dragState.draggedDino = {
            type: e.target.dataset.dinoType,
            position: parseInt(e.target.dataset.position)
        };
        
        e.target.classList.add('dragging');
        
        // Identificar recintos válidos
        this.highlightValidTargets();
        
        // Datos para el drag
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify(this.dragState.draggedDino));
    }

    handleDragEnd(e) {
        console.log('🔴 Finalizando drag...');
        
        e.target.classList.remove('dragging');
        this.clearHighlights();
        
        this.dragState.isDragging = false;
        this.dragState.draggedElement = null;
        this.dragState.draggedDino = null;
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    handleDragEnter(e) {
        e.preventDefault();
        const enclosureId = parseInt(e.currentTarget.dataset.enclosureId);
        
        if (this.isValidPlacement(enclosureId, this.dragState.draggedDino)) {
            e.currentTarget.classList.add('drop-target-valid');
        } else {
            e.currentTarget.classList.add('drop-target-invalid');
        }
    }

    handleDragLeave(e) {
        e.currentTarget.classList.remove('drop-target-valid', 'drop-target-invalid');
    }

    async handleDrop(e) {
        e.preventDefault();
        
        const enclosureId = parseInt(e.currentTarget.dataset.enclosureId);
        const dinoData = JSON.parse(e.dataTransfer.getData('text/plain'));
        
        console.log(`🎯 Intentando colocar ${dinoData.type} en recinto ${enclosureId}`);
        
        if (this.isValidPlacement(enclosureId, dinoData)) {
            await this.placeDinosaur(enclosureId, dinoData);
        } else {
            this.showToast('Movimiento no válido', 'error');
        }
        
        this.clearHighlights();
    }

    // ==================== VALIDACIONES DE COLOCACIÓN ==================== 
    isValidPlacement(enclosureId, dinoData) {
        if (!enclosureId || !dinoData) return false;
        
        const enclosure = this.gameConfig.ENCLOSURES[enclosureId];
        if (!enclosure) return false;
        
        // Verificar capacidad del recinto
        const currentBoard = this.currentPlayer === 1 ? this.boardState.player1Board : this.boardState.player2Board;
        const currentCount = currentBoard[enclosureId] ? currentBoard[enclosureId].length : 0;
        
        if (currentCount >= enclosure.maxCapacity) {
            console.log(`❌ Recinto ${enclosureId} lleno (${currentCount}/${enclosure.maxCapacity})`);
            return false;
        }
        
        // Verificar restricciones del dado
        if (!this.validateDiceRestriction(enclosureId, dinoData)) {
            console.log(`❌ Restricción del dado no cumplida: ${this.diceRestriction}`);
            return false;
        }
        
        // Validaciones específicas por tipo de recinto
        if (!this.validateEnclosureSpecificRules(enclosureId, dinoData)) {
            console.log(`❌ Reglas específicas del recinto no cumplidas`);
            return false;
        }
        
        return true;
    }

    validateDiceRestriction(enclosureId, dinoData) {
        if (!this.diceRestriction) return true;
        
        const enclosure = this.gameConfig.ENCLOSURES[enclosureId];
        const currentBoard = this.currentPlayer === 1 ? this.boardState.player1Board : this.boardState.player2Board;
        
        switch (this.diceRestriction) {
            case 'baños':
                // Debe ser adyacente a baño (recinto 6)
                return this.isAdjacentToEnclosure(enclosureId, 6);
                
            case 'huella':
                // Recinto debe tener al menos 1 dinosaurio
                return currentBoard[enclosureId] && currentBoard[enclosureId].length > 0;
                
            case 'no_trex':
                // No puede haber T-Rex en el recinto
                if (currentBoard[enclosureId]) {
                    return !currentBoard[enclosureId].some(dino => dino.type === 'T-Rex');
                }
                return true;
                
            case 'cafe':
                // Debe ser adyacente a cafetería (recinto 5)
                return this.isAdjacentToEnclosure(enclosureId, 5);
                
            case 'bosque':
                // Debe ser zona boscosa
                return enclosure.type === 'bosque' || enclosure.type === 'pradera';
                
            case 'rocas':
                // Debe ser zona rocosa
                return enclosure.type === 'rocas' || enclosureId === 7; // Río siempre válido
                
            default:
                return true;
        }
    }

    isAdjacentToEnclosure(enclosureId, targetEnclosureId) {
        const adjacencyMap = {
            1: [2, 4], // Pradera Progresiva
            2: [1, 3, 7], // Trío del Bosque
            3: [2, 6], // Pradera del Amor
            4: [1, 5, 7], // Rey de la Selva
            5: [4, 6, 7], // Cine/Comida
            6: [3, 5], // Baños
            7: [2, 4, 5] // Río
        };
        
        return adjacencyMap[enclosureId]?.includes(targetEnclosureId) || false;
    }

    validateEnclosureSpecificRules(enclosureId, dinoData) {
        const enclosure = this.gameConfig.ENCLOSURES[enclosureId];
        const currentBoard = this.currentPlayer === 1 ? this.boardState.player1Board : this.boardState.player2Board;
        
        switch (enclosureId) {
            case 1: // Pradera Progresiva
                return true; // Sin restricciones especiales
                
            case 2: // Trío del Bosque
                return true; // Solo límite de capacidad
                
            case 3: // Pradera del Amor
                return true; // Sin restricciones especiales
                
            case 4: // Rey de la Selva
                return true; // Solo 1 dinosaurio
                
            case 5: // Cine/Comida
                return true; // Sin restricciones especiales
                
            case 6: // Baños
                return true; // Solo 1 dinosaurio
                
            case 7: // Río
                return true; // Siempre válido
                
            default:
                return false;
        }
    }

    highlightValidTargets() {
        const recintos = document.querySelectorAll('.recinto');
        
        recintos.forEach(recinto => {
            const enclosureId = parseInt(recinto.dataset.enclosureId);
            
            if (this.isValidPlacement(enclosureId, this.dragState.draggedDino)) {
                recinto.classList.add('valid-target');
            } else {
                recinto.classList.add('invalid-target');
            }
        });
    }

    clearHighlights() {
        const recintos = document.querySelectorAll('.recinto');
        recintos.forEach(recinto => {
            recinto.classList.remove('valid-target', 'invalid-target', 'drop-target-valid', 'drop-target-invalid');
        });
    }

    // ==================== COLOCACIÓN DE DINOSAURIOS ==================== 
    async placeDinosaur(enclosureId, dinoData) {
        console.log(`🦕 Colocando ${dinoData.type} en recinto ${enclosureId}`);
        
        try {
            // Actualizar estado local
            this.updateLocalBoardState(enclosureId, dinoData);
            
            // Enviar al servidor
            const response = await fetch('api/game/place-dinosaur.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    game_id: this.gameSession.id,
                    player_number: this.currentPlayer,
                    enclosure_id: enclosureId,
                    dinosaur_type: dinoData.type,
                    position: dinoData.position
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Actualizar interfaz
                this.updateBoardInterface();
                this.updatePlayerHand();
                this.updateScores();
                
                // Verificar si el turno ha terminado
                this.checkTurnComplete();
                
                this.showToast(`${dinoData.type} colocado correctamente`, 'success');
            } else {
                // Revertir cambio local
                this.revertLocalBoardState(enclosureId, dinoData);
                this.showToast(data.message || 'Error al colocar dinosaurio', 'error');
            }
        } catch (error) {
            console.error('Error colocando dinosaurio:', error);
            this.revertLocalBoardState(enclosureId, dinoData);
            this.showToast('Error de conexión', 'error');
        }
    }

    updateLocalBoardState(enclosureId, dinoData) {
        const currentBoard = this.currentPlayer === 1 ? this.boardState.player1Board : this.boardState.player2Board;
        const currentHand = this.currentPlayer === 1 ? this.boardState.player1Hand : this.boardState.player2Hand;
        
        // Añadir al tablero
        if (!currentBoard[enclosureId]) {
            currentBoard[enclosureId] = [];
        }
        currentBoard[enclosureId].push({
            type: dinoData.type,
            timestamp: Date.now()
        });
        
        // Remover de la mano
        currentHand.splice(dinoData.position, 1);
        
        console.log('🔄 Estado local actualizado:', { board: currentBoard, hand: currentHand });
    }

    revertLocalBoardState(enclosureId, dinoData) {
        const currentBoard = this.currentPlayer === 1 ? this.boardState.player1Board : this.boardState.player2Board;
        const currentHand = this.currentPlayer === 1 ? this.boardState.player1Hand : this.boardState.player2Hand;
        
        // Remover del tablero
        if (currentBoard[enclosureId]) {
            currentBoard[enclosureId].pop();
            if (currentBoard[enclosureId].length === 0) {
                delete currentBoard[enclosureId];
            }
        }
        
        // Devolver a la mano
        currentHand.splice(dinoData.position, 0, { type: dinoData.type });
    }

    updateBoardInterface() {
        const currentBoard = this.currentPlayer === 1 ? this.boardState.player1Board : this.boardState.player2Board;
        
        Object.keys(currentBoard).forEach(enclosureId => {
            const dinosaurs = currentBoard[enclosureId];
            const enclosureElement = document.querySelector(`[data-enclosure-id="${enclosureId}"]`);
            
            if (enclosureElement) {
                const dinoContainer = enclosureElement.querySelector('.dinosaur-container');
                dinoContainer.innerHTML = '';
                
                dinosaurs.forEach(dino => {
                    const dinoElement = document.createElement('div');
                    dinoElement.className = 'placed-dinosaur';
                    dinoElement.innerHTML = `<img src="img/dino-${dino.type.toLowerCase()}.png" alt="${dino.type}">`;
                    dinoContainer.appendChild(dinoElement);
                });
                
                // Actualizar contador
                const capacity = this.gameConfig.ENCLOSURES[enclosureId].maxCapacity;
                const counter = enclosureElement.querySelector('.recinto-capacity');
                if (counter) {
                    counter.textContent = `${dinosaurs.length}/${capacity}`;
                }
            }
        });
    }

    updatePlayerHand() {
        this.updateDraggableElements();
    }

    checkTurnComplete() {
        const currentHand = this.currentPlayer === 1 ? this.boardState.player1Hand : this.boardState.player2Hand;
        
        if (currentHand.length === 0) {
            // Se acabaron los dinosaurios de este jugador
            this.handleRoundComplete();
        } else {
            // Mostrar botón de finalizar turno
            this.showFinishTurnButton();
        }
    }

    showFinishTurnButton() {
        const button = document.getElementById('finish-turn-btn');
        if (button) {
            button.style.display = 'block';
            button.onclick = () => this.finishTurn();
        }
    }
    // ==================== GESTIÓN DE TURNOS Y RONDAS ==================== 
    async finishTurn() {
        console.log(`🔄 Finalizando turno del jugador ${this.currentPlayer}`);
        
        // Ocultar botón
        const button = document.getElementById('finish-turn-btn');
        if (button) {
            button.style.display = 'none';
        }
        
        // Cambiar de jugador
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        
        // Lanzar dado para el siguiente jugador
        await this.rollDiceAndContinue();
        
        // Actualizar interfaz
        this.updateGameInterface();
    }

    async rollDiceAndContinue() {
        // Mostrar animación de dado
        await this.showDiceAnimation();
        
        // Actualizar restricción en la interfaz
        this.updateDiceRestrictionDisplay();
    }

    updateDiceRestrictionDisplay() {
        const restrictionElement = document.getElementById('current-restriction');
        if (restrictionElement) {
            restrictionElement.innerHTML = `
                <img src="img/dado-${this.diceRestriction}.png" alt="${this.diceRestriction}">
                <span>Restricción: ${this.getRestrictionText(this.diceRestriction)}</span>
            `;
        }
    }

    async handleRoundComplete() {
        console.log(`🏁 Ronda ${this.currentRound} completada`);
        
        // Calcular puntuaciones de la ronda
        await this.calculateRoundScores();
        
        if (this.currentRound === 1) {
            // Guardar puntuaciones de la primera ronda
            this.boardState.round1Scores = {
                player1: this.boardState.player1Score,
                player2: this.boardState.player2Score
            };
            
            // Mostrar resumen de ronda
            this.showScreen('resumen-ronda');
        } else {
            // Guardar puntuaciones de la segunda ronda
            this.boardState.round2Scores = {
                player1: this.boardState.player1Score - this.boardState.round1Scores.player1,
                player2: this.boardState.player2Score - this.boardState.round1Scores.player2
            };
            
            // Juego terminado
            this.handleGameComplete();
        }
    }

    async calculateRoundScores() {
        try {
            const response = await fetch('calculate-scores.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    game_id: this.gameSession.id,
                    round: this.currentRound
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.boardState.player1Score = data.player1_score;
                this.boardState.player2Score = data.player2_score;
                console.log('🏆 Puntuaciones calculadas:', data);
            } else {
                throw new Error(data.message || 'Error al calcular puntuaciones');
            }
        } catch (error) {
            console.error('Error calculando puntuaciones:', error);
            this.showToast('Error al calcular puntuaciones', 'error');
        }
    }

    async startNextRound() {
        console.log('🆕 Iniciando ronda 2...');
        
        this.currentRound = 2;
        this.currentPlayer = 1;
        
        // Limpiar tableros para la nueva ronda
        this.boardState.player1Board = {};
        this.boardState.player2Board = {};
        
        // Repartir nuevos dinosaurios
        await this.dealDinosaurs();
        
        // Lanzar dado inicial
        await this.rollDiceAndStart();
    }

    handleGameComplete() {
        console.log('🎉 Juego completado');
        this.showScreen('final');
    }

    // ==================== INTERFAZ DE USUARIO ==================== 
    updateGameInterface() {
        this.updatePlayerInfo();
        this.updatePlayerHand();
        this.updateScores();
        this.updateDiceRestrictionDisplay();
    }

    updatePlayerInfo() {
        const currentPlayerInfo = document.getElementById('current-player-info');
        const opponentInfo = document.getElementById('opponent-info');
        
        if (currentPlayerInfo && this.gameSession) {
            const currentPlayerData = this.gameSession[`player${this.currentPlayer}`];
            currentPlayerInfo.innerHTML = `
                <div class="player-avatar">
                    <img src="img/avatar-${this.currentPlayer}.png" alt="${currentPlayerData.name}">
                </div>
                <div class="player-details">
                    <h3>${currentPlayerData.name}</h3>
                    <p>Tu turno</p>
                </div>
            `;
        }
        
        if (opponentInfo && this.gameSession) {
            const opponentPlayer = this.currentPlayer === 1 ? 2 : 1;
            const opponentData = this.gameSession[`player${opponentPlayer}`];
            const opponentScore = opponentPlayer === 1 ? this.boardState.player1Score : this.boardState.player2Score;
            
            opponentInfo.innerHTML = `
                <div class="opponent-details">
                    <h4>${opponentData.name}</h4>
                    <p>Puntos: ${opponentScore}</p>
                </div>
                <button class="btn btn-secondary" onclick="app.showOpponentMap()">Ver Mapa</button>
            `;
        }
    }

    updateScores() {
        const player1ScoreElement = document.getElementById('player1-score');
        const player2ScoreElement = document.getElementById('player2-score');
        
        if (player1ScoreElement) {
            player1ScoreElement.textContent = this.boardState.player1Score;
        }
        
        if (player2ScoreElement) {
            player2ScoreElement.textContent = this.boardState.player2Score;
        }
    }

    // ==================== POPUP VER MAPA ==================== 
    showOpponentMap() {
        const opponentPlayer = this.currentPlayer === 1 ? 2 : 1;
        const opponentBoard = opponentPlayer === 1 ? this.boardState.player1Board : this.boardState.player2Board;
        const opponentScore = opponentPlayer === 1 ? this.boardState.player1Score : this.boardState.player2Score;
        
        // Crear popup
        const popup = document.createElement('div');
        popup.className = 'popup-overlay';
        popup.innerHTML = `
            <div class="popup-content">
                <div class="popup-header">
                    <h3>Mapa del Oponente</h3>
                    <p>Puntos: ${opponentScore}</p>
                </div>
                <div class="popup-board">
                    ${this.generateOpponentBoardHTML(opponentBoard)}
                </div>
                <div class="popup-scores">
                    ${this.generateOpponentScoresHTML(opponentBoard)}
                </div>
            </div>
        `;
        
        // Cerrar al hacer click fuera
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                document.body.removeChild(popup);
            }
        });
        
        document.body.appendChild(popup);
    }

    generateOpponentBoardHTML(opponentBoard) {
        let html = '<div class="opponent-board-grid">';
        
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                if (row === 1 && col === 1) {
                    // Río
                    html += `<div class="opponent-recinto rio">
                        <span>Río</span>
                        <div class="opponent-dinosaurs">
                            ${this.generateDinosaursHTML(opponentBoard[7] || [])}
                        </div>
                    </div>`;
                } else {
                    const enclosureId = this.getEnclosureIdByPosition(row, col);
                    if (enclosureId) {
                        const enclosure = this.gameConfig.ENCLOSURES[enclosureId];
                        const dinosaurs = opponentBoard[enclosureId] || [];
                        
                        html += `<div class="opponent-recinto">
                            <span>${enclosure.name}</span>
                            <div class="opponent-dinosaurs">
                                ${this.generateDinosaursHTML(dinosaurs)}
                            </div>
                        </div>`;
                    } else {
                        html += '<div class="opponent-recinto empty"></div>';
                    }
                }
            }
        }
        
        html += '</div>';
        return html;
    }

    generateDinosaursHTML(dinosaurs) {
        return dinosaurs.map(dino => 
            `<img src="img/dino-${dino.type.toLowerCase()}.png" alt="${dino.type}" class="opponent-dino">`
        ).join('');
    }

    generateOpponentScoresHTML(opponentBoard) {
        let html = '<div class="opponent-scores-breakdown">';
        
        Object.keys(this.gameConfig.ENCLOSURES).forEach(enclosureId => {
            const enclosure = this.gameConfig.ENCLOSURES[enclosureId];
            const dinosaurs = opponentBoard[enclosureId] || [];
            const points = this.calculateEnclosurePoints(parseInt(enclosureId), dinosaurs);
            
            if (dinosaurs.length > 0) {
                html += `<div class="score-item">
                    <span>${enclosure.name}</span>
                    <span>${points} pts</span>
                </div>`;
            }
        });
        
        html += '</div>';
        return html;
    }

    calculateEnclosurePoints(enclosureId, dinosaurs) {
        const count = dinosaurs.length;
        
        switch (enclosureId) {
            case 1: // Pradera Progresiva
                return this.gameConfig.POINTS_RULES.pradera_progresiva[count] || 0;
                
            case 2: // Trío del Bosque
                return this.gameConfig.POINTS_RULES.trio_bosque[count] || 0;
                
            case 3: // Pradera del Amor
                const pairs = Math.floor(count / 2);
                return pairs * 5;
                
            case 4: // Rey de la Selva
                return count > 0 ? 7 : 0;
                
            case 5: // Cine/Comida
                return this.gameConfig.POINTS_RULES.comida[count] || 0;
                
            case 6: // Baños
                return count > 0 ? 7 : 0;
                
            case 7: // Río
                return 0;
                
            default:
                return 0;
        }
    }

    // ==================== PANTALLAS DE RESUMEN ==================== 
    displayRoundSummary() {
        const summaryContainer = document.getElementById('round-summary');
        if (!summaryContainer) return;
        
        const player1Data = this.gameSession.player1;
        const player2Data = this.gameSession.player2;
        
        summaryContainer.innerHTML = `
            <div class="round-summary-content">
                <h2>Resumen - Ronda 1</h2>
                <div class="players-summary">
                    <div class="player-summary">
                        <h3>${player1Data.name}</h3>
                        <div class="score">${this.boardState.round1Scores.player1} puntos</div>
                    </div>
                    <div class="player-summary">
                        <h3>${player2Data.name}</h3>
                        <div class="score">${this.boardState.round1Scores.player2} puntos</div>
                    </div>
                </div>
                <div class="summary-breakdown">
                    ${this.generateRoundBreakdown()}
                </div>
            </div>
        `;
    }

    generateRoundBreakdown() {
        let html = '<div class="breakdown-grid">';
        
        // Breakdown para cada jugador
        for (let player = 1; player <= 2; player++) {
            const playerData = this.gameSession[`player${player}`];
            const playerBoard = player === 1 ? this.boardState.player1Board : this.boardState.player2Board;
            
            html += `<div class="player-breakdown">
                <h4>${playerData.name}</h4>
                <div class="enclosure-scores">`;
            
            Object.keys(this.gameConfig.ENCLOSURES).forEach(enclosureId => {
                const enclosure = this.gameConfig.ENCLOSURES[enclosureId];
                const dinosaurs = playerBoard[enclosureId] || [];
                const points = this.calculateEnclosurePoints(parseInt(enclosureId), dinosaurs);
                
                if (dinosaurs.length > 0) {
                    html += `<div class="enclosure-score">
                        <span>${enclosure.name}</span>
                        <span>${dinosaurs.length} dinos</span>
                        <span>${points} pts</span>
                    </div>`;
                }
            });
            
            html += '</div></div>';
        }
        
        html += '</div>';
        return html;
    }

    displayFinalResults() {
        const resultsContainer = document.getElementById('final-results');
        if (!resultsContainer) return;
        
        const totalPlayer1 = this.boardState.player1Score;
        const totalPlayer2 = this.boardState.player2Score;
        const winner = totalPlayer1 > totalPlayer2 ? this.gameSession.player1 : this.gameSession.player2;
        const isWinner1 = totalPlayer1 > totalPlayer2;
        
        resultsContainer.innerHTML = `
            <div class="final-results-content">
                <div class="winner-announcement">
                    <h2>🏆 ¡${winner.name} Gana!</h2>
                    <div class="final-scores">
                        <div class="player-final-score ${isWinner1 ? 'winner' : ''}">
                            <h3>${this.gameSession.player1.name}</h3>
                            <div class="total-score">${totalPlayer1}</div>
                            <div class="round-breakdown">
                                <span>Ronda 1: ${this.boardState.round1Scores.player1}</span>
                                <span>Ronda 2: ${this.boardState.round2Scores.player1}</span>
                            </div>
                        </div>
                        <div class="player-final-score ${!isWinner1 ? 'winner' : ''}">
                            <h3>${this.gameSession.player2.name}</h3>
                            <div class="total-score">${totalPlayer2}</div>
                            <div class="round-breakdown">
                                <span>Ronda 1: ${this.boardState.round1Scores.player2}</span>
                                <span>Ronda 2: ${this.boardState.round2Scores.player2}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="game-statistics">
                    ${this.generateGameStatistics()}
                </div>
            </div>
        `;
    }

    generateGameStatistics() {
        const duration = Math.floor((Date.now() - this.debug.startTime) / 1000 / 60); // minutos
        const totalMoves = Object.keys(this.boardState.player1Board).length + Object.keys(this.boardState.player2Board).length;
        
        return `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Duración</span>
                    <span class="stat-value">${duration} min</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Movimientos</span>
                    <span class="stat-value">${totalMoves}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Diferencia</span>
                    <span class="stat-value">${Math.abs(this.boardState.player1Score - this.boardState.player2Score)} pts</span>
                </div>
            </div>
        `;
    }
    // ==================== EVENTOS TOUCH PARA MÓVILES ==================== 
    handleTouchStart(e) {
        e.preventDefault();
        
        this.dragState.isDragging = true;
        this.dragState.draggedElement = e.target;
        this.dragState.draggedDino = {
            type: e.target.dataset.dinoType,
            position: parseInt(e.target.dataset.position)
        };
        
        const touch = e.touches[0];
        this.dragState.startPosition = {
            x: touch.clientX,
            y: touch.clientY
        };
        
        e.target.classList.add('dragging');
        this.highlightValidTargets();
        
        // Crear elemento drag visual
        this.createDragPreview(e.target, touch.clientX, touch.clientY);
    }

    handleTouchMove(e) {
        if (!this.dragState.isDragging) return;
        
        e.preventDefault();
        const touch = e.touches[0];
        
        // Actualizar posición del preview
        this.updateDragPreview(touch.clientX, touch.clientY);
        
        // Detectar elemento debajo del dedo
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        const recinto = elementBelow?.closest('.recinto');
        
        // Limpiar highlights anteriores
        document.querySelectorAll('.recinto').forEach(r => {
            r.classList.remove('touch-hover-valid', 'touch-hover-invalid');
        });
        
        if (recinto) {
            const enclosureId = parseInt(recinto.dataset.enclosureId);
            if (this.isValidPlacement(enclosureId, this.dragState.draggedDino)) {
                recinto.classList.add('touch-hover-valid');
            } else {
                recinto.classList.add('touch-hover-invalid');
            }
        }
    }

    handleTouchEnd(e) {
        if (!this.dragState.isDragging) return;
        
        e.preventDefault();
        const touch = e.changedTouches[0];
        
        // Encontrar elemento de destino
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        const recinto = elementBelow?.closest('.recinto');
        
        if (recinto) {
            const enclosureId = parseInt(recinto.dataset.enclosureId);
            if (this.isValidPlacement(enclosureId, this.dragState.draggedDino)) {
                this.placeDinosaur(enclosureId, this.dragState.draggedDino);
            } else {
                this.showToast('Movimiento no válido', 'error');
            }
        }
        
        // Limpiar estado
        this.clearDragState();
    }

    createDragPreview(element, x, y) {
        const preview = element.cloneNode(true);
        preview.id = 'drag-preview';
        preview.className = 'drag-preview';
        preview.style.position = 'fixed';
        preview.style.left = `${x - 30}px`;
        preview.style.top = `${y - 30}px`;
        preview.style.zIndex = '9999';
        preview.style.pointerEvents = 'none';
        preview.style.transform = 'scale(0.8)';
        preview.style.opacity = '0.8';
        
        document.body.appendChild(preview);
    }

    updateDragPreview(x, y) {
        const preview = document.getElementById('drag-preview');
        if (preview) {
            preview.style.left = `${x - 30}px`;
            preview.style.top = `${y - 30}px`;
        }
    }

    clearDragState() {
        this.dragState.isDragging = false;
        this.dragState.draggedElement?.classList.remove('dragging');
        this.dragState.draggedElement = null;
        this.dragState.draggedDino = null;
        
        // Remover preview
        const preview = document.getElementById('drag-preview');
        if (preview) {
            document.body.removeChild(preview);
        }
        
        // Limpiar highlights
        this.clearHighlights();
        document.querySelectorAll('.recinto').forEach(r => {
            r.classList.remove('touch-hover-valid', 'touch-hover-invalid');
        });
    }

    // ==================== SISTEMA DE LOADING ==================== 
    setLoading(isLoading) {
        this.loading = isLoading;
        const buttons = document.querySelectorAll('.btn');
        const body = document.body;
        
        if (isLoading) {
            // Mostrar overlay de loading
            this.showLoadingOverlay();
            
            // Deshabilitar botones
            buttons.forEach(btn => {
                btn.classList.add('btn--loading');
                btn.disabled = true;
            });
            
            body.style.cursor = 'wait';
        } else {
            // Ocultar overlay
            this.hideLoadingOverlay();
            
            // Habilitar botones
            buttons.forEach(btn => {
                btn.classList.remove('btn--loading');
                btn.disabled = false;
            });
            
            body.style.cursor = 'default';
        }
    }

    showLoadingOverlay() {
        let overlay = document.getElementById('loading-overlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Cargando...</p>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        
        overlay.style.display = 'flex';
        setTimeout(() => overlay.classList.add('active'), 10);
    }

    hideLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 300);
        }
    }

    // ==================== SISTEMA DE TOASTS ==================== 
    showToast(message, type = 'info', duration = 4000) {
        const container = this.getToastContainer();
        const toast = this.createToastElement(message, type);
        
        container.appendChild(toast);
        
        // Mostrar con animación
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Auto-remover
        setTimeout(() => {
            this.removeToast(toast);
        }, duration);
        
        // Limitar número de toasts
        this.limitToasts(container);
    }

    getToastContainer() {
        let container = document.getElementById('toast-container');
        
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        
        return container;
    }

    createToastElement(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        toast.innerHTML = `
            <div class="toast__icon">${icons[type] || icons.info}</div>
            <div class="toast__message">${message}</div>
            <button class="toast__close" onclick="app.removeToast(this.parentElement)">✕</button>
        `;
        
        // Click para cerrar
        toast.addEventListener('click', () => this.removeToast(toast));
        
        return toast;
    }

    removeToast(toast) {
        if (!toast || !toast.parentElement) return;
        
        toast.classList.remove('show');
        toast.classList.add('removing');
        
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
        }, 300);
    }

    limitToasts(container, maxToasts = 5) {
        const toasts = container.querySelectorAll('.toast');
        if (toasts.length > maxToasts) {
            for (let i = 0; i < toasts.length - maxToasts; i++) {
                this.removeToast(toasts[i]);
            }
        }
    }

    hideToasts() {
        const container = document.getElementById('toast-container');
        if (container) {
            const toasts = container.querySelectorAll('.toast');
            toasts.forEach(toast => this.removeToast(toast));
        }
    }

    // ==================== UTILIDADES ==================== 
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // ==================== PERSISTENCIA Y ESTADO ==================== 
    saveGameState() {
        if (!this.gameSession) return;
        
        const gameState = {
            gameSession: this.gameSession,
            currentPlayer: this.currentPlayer,
            currentRound: this.currentRound,
            diceRestriction: this.diceRestriction,
            boardState: this.boardState,
            timestamp: Date.now()
        };
        
        try {
            localStorage.setItem('draftosaurus_game_state', JSON.stringify(gameState));
            console.log('💾 Estado del juego guardado');
        } catch (error) {
            console.error('Error guardando estado:', error);
        }
    }

    loadGameState() {
        try {
            const savedState = localStorage.getItem('draftosaurus_game_state');
            if (!savedState) return false;
            
            const gameState = JSON.parse(savedState);
            
            // Verificar que el estado no sea muy antiguo (1 hora)
            if (Date.now() - gameState.timestamp > 3600000) {
                localStorage.removeItem('draftosaurus_game_state');
                return false;
            }
            
            // Restaurar estado
            this.gameSession = gameState.gameSession;
            this.currentPlayer = gameState.currentPlayer;
            this.currentRound = gameState.currentRound;
            this.diceRestriction = gameState.diceRestriction;
            this.boardState = gameState.boardState;
            
            console.log('📖 Estado del juego cargado');
            return true;
        } catch (error) {
            console.error('Error cargando estado:', error);
            localStorage.removeItem('draftosaurus_game_state');
            return false;
        }
    }

    async loadGameConfiguration() {
        try {
            const response = await fetch('config.php');
            const config = await response.json();
            
            if (config.success) {
                // Actualizar configuración con datos del servidor
                Object.assign(this.gameConfig, config.data);
                console.log('⚙️ Configuración cargada:', config.data);
            }
        } catch (error) {
            console.error('Error cargando configuración:', error);
            // Usar configuración por defecto
        }
    }

    updateUserInfo() {
        if (!this.user) return;
        
        const userElements = document.querySelectorAll('.user-name');
        userElements.forEach(el => {
            el.textContent = this.user.username;
        });
        
        const avatarElements = document.querySelectorAll('.user-avatar img');
        avatarElements.forEach(el => {
            el.src = this.user.avatar || 'img/avatar-default.png';
        });
    }
    // ==================== CONFIGURACIÓN DE BOTONES DEL JUEGO ==================== 
    setupGameButtons() {
        // Botón finalizar turno
        const finishTurnBtn = document.getElementById('finish-turn-btn');
        if (finishTurnBtn) {
            finishTurnBtn.onclick = () => this.finishTurn();
            finishTurnBtn.style.display = 'none'; // Inicialmente oculto
        }
        
        // Botón ver mapa del oponente
        const viewMapBtn = document.getElementById('view-opponent-map-btn');
        if (viewMapBtn) {
            viewMapBtn.onclick = () => this.showOpponentMap();
        }
        
        // Botón de menú/pausa
        const menuBtn = document.getElementById('game-menu-btn');
        if (menuBtn) {
            menuBtn.onclick = () => this.showGameMenu();
        }
        
        // Botón de ayuda
        const helpBtn = document.getElementById('help-btn');
        if (helpBtn) {
            helpBtn.onclick = () => this.showHelp();
        }
    }

    showGameMenu() {
        const menu = document.createElement('div');
        menu.className = 'popup-overlay';
        menu.innerHTML = `
            <div class="popup-content game-menu">
                <h3>Menú del Juego</h3>
                <div class="menu-options">
                    <button class="btn btn-secondary" onclick="app.saveGameState(); app.closePopup(this)">Guardar Partida</button>
                    <button class="btn btn-secondary" onclick="app.showHelp()">Ayuda</button>
                    <button class="btn btn-secondary" onclick="app.showGameStats()">Estadísticas</button>
                    <button class="btn btn-danger" onclick="app.confirmExitGame()">Salir del Juego</button>
                    <button class="btn btn-primary" onclick="app.closePopup(this)">Continuar</button>
                </div>
            </div>
        `;
        
        menu.addEventListener('click', (e) => {
            if (e.target === menu) {
                this.closePopup(menu);
            }
        });
        
        document.body.appendChild(menu);
    }

    showHelp() {
        const help = document.createElement('div');
        help.className = 'popup-overlay';
        help.innerHTML = `
            <div class="popup-content help-content">
                <h3>Cómo Jugar Draftosaurus</h3>
                <div class="help-sections">
                    <div class="help-section">
                        <h4>🎯 Objetivo</h4>
                        <p>Coloca tus dinosaurios en los recintos para obtener la mayor cantidad de puntos.</p>
                    </div>
                    <div class="help-section">
                        <h4>🎲 Restricciones del Dado</h4>
                        <ul>
                            <li><strong>Baños:</strong> Solo en recintos adyacentes a baños</li>
                            <li><strong>Huella:</strong> Solo en recintos que ya tengan dinosaurios</li>
                            <li><strong>No T-Rex:</strong> Solo en recintos sin T-Rex</li>
                            <li><strong>Café:</strong> Solo en recintos adyacentes a la cafetería</li>
                            <li><strong>Bosque:</strong> Solo en zona boscosa</li>
                            <li><strong>Rocas:</strong> Solo en zona rocosa</li>
                        </ul>
                    </div>
                    <div class="help-section">
                        <h4>🏆 Puntuación</h4>
                        <ul>
                            <li><strong>Pradera Progresiva:</strong> 2, 4, 8, 12, 18, 24 puntos (por cantidad)</li>
                            <li><strong>Trío del Bosque:</strong> 2, 5, 7 puntos (máximo 3 dinosaurios)</li>
                            <li><strong>Pradera del Amor:</strong> 5 puntos por pareja</li>
                            <li><strong>Rey de la Selva:</strong> 7 puntos (solo 1 dinosaurio)</li>
                            <li><strong>Cine/Comida:</strong> 1, 3, 6, 10, 15, 21 puntos</li>
                            <li><strong>Baños:</strong> 7 puntos (solo 1 dinosaurio)</li>
                        </ul>
                    </div>
                </div>
                <button class="btn btn-primary" onclick="app.closePopup(this)">Entendido</button>
            </div>
        `;
        
        help.addEventListener('click', (e) => {
            if (e.target === help) {
                this.closePopup(help);
            }
        });
        
        document.body.appendChild(help);
    }

    showGameStats() {
        const currentTime = Date.now();
        const gameTime = this.formatTime(currentTime - this.debug.startTime);
        const movesPlayer1 = Object.values(this.boardState.player1Board).flat().length;
        const movesPlayer2 = Object.values(this.boardState.player2Board).flat().length;
        
        const stats = document.createElement('div');
        stats.className = 'popup-overlay';
        stats.innerHTML = `
            <div class="popup-content stats-content">
                <h3>Estadísticas de la Partida</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Tiempo de juego</span>
                        <span class="stat-value">${gameTime}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Ronda actual</span>
                        <span class="stat-value">${this.currentRound}/2</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Turno de</span>
                        <span class="stat-value">${this.gameSession[`player${this.currentPlayer}`].name}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Dinosaurios ${this.gameSession.player1.name}</span>
                        <span class="stat-value">${movesPlayer1} colocados</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Dinosaurios ${this.gameSession.player2.name}</span>
                        <span class="stat-value">${movesPlayer2} colocados</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Restricción actual</span>
                        <span class="stat-value">${this.getRestrictionText(this.diceRestriction)}</span>
                    </div>
                </div>
                <button class="btn btn-primary" onclick="app.closePopup(this)">Cerrar</button>
            </div>
        `;
        
        stats.addEventListener('click', (e) => {
            if (e.target === stats) {
                this.closePopup(stats);
            }
        });
        
        document.body.appendChild(stats);
    }

    confirmExitGame() {
        const confirm = document.createElement('div');
        confirm.className = 'popup-overlay';
        confirm.innerHTML = `
            <div class="popup-content confirm-dialog">
                <h3>¿Salir del juego?</h3>
                <p>¿Estás seguro de que quieres salir? El progreso se guardará automáticamente.</p>
                <div class="confirm-buttons">
                    <button class="btn btn-secondary" onclick="app.closePopup(this)">Cancelar</button>
                    <button class="btn btn-danger" onclick="app.exitGame()">Salir</button>
                </div>
            </div>
        `;
        
        confirm.addEventListener('click', (e) => {
            if (e.target === confirm) {
                this.closePopup(confirm);
            }
        });
        
        document.body.appendChild(confirm);
    }

    exitGame() {
        this.saveGameState();
        this.closePopup(document.querySelector('.popup-overlay'));
        this.showScreen('lobby');
    }

    closePopup(element) {
        const popup = element.closest('.popup-overlay');
        if (popup && popup.parentElement) {
            popup.parentElement.removeChild(popup);
        }
    }

    // ==================== MANEJO DE ERRORES ==================== 
    handleGlobalError(event) {
        console.error('🚨 Error global:', event.error);
        
        const errorInfo = {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            gameState: this.getCurrentGameState()
        };
        
        this.logError('global_error', errorInfo);
        
        // Solo mostrar toast si el error no es crítico
        if (!this.isCriticalError(event.error)) {
            this.showToast('Ha ocurrido un error. Por favor, recarga la página si persiste.', 'error');
        }
    }

    handleUnhandledPromise(event) {
        console.error('🚨 Promise rechazada:', event.reason);
        
        const errorInfo = {
            reason: event.reason,
            promise: event.promise,
            timestamp: new Date().toISOString(),
            gameState: this.getCurrentGameState()
        };
        
        this.logError('unhandled_promise', errorInfo);
        
        // Prevenir que aparezca en consola
        event.preventDefault();
        
        this.showToast('Error de conexión. Verifica tu internet.', 'warning');
    }

    handleBeforeUnload(event) {
        // Guardar estado antes de salir
        this.saveGameState();
        
        // Solo mostrar confirmación si hay un juego activo
        if (this.gameSession && this.currentScreen === 'partida') {
            const message = '¿Estás seguro de que quieres salir? El progreso se guardará.';
            event.returnValue = message;
            return message;
        }
    }

    isCriticalError(error) {
        if (!error) return false;
        
        const criticalMessages = [
            'Network error',
            'Failed to fetch',
            'TypeError: Cannot read',
            'ReferenceError',
            'SyntaxError'
        ];
        
        return criticalMessages.some(msg => 
            error.message?.includes(msg) || error.toString().includes(msg)
        );
    }

    logError(type, details) {
        const errorLog = {
            type,
            details,
            timestamp: Date.now(),
            sessionId: this.generateUUID()
        };
        
        // Guardar en debug logs
        this.debug.logs.push(errorLog);
        
        // Enviar al servidor (opcional)
        if (navigator.onLine) {
            this.sendErrorToServer(errorLog);
        }
    }

    async sendErrorToServer(errorLog) {
        try {
            await fetch('log-error.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(errorLog)
            });
        } catch (error) {
            console.warn('No se pudo enviar el error al servidor:', error);
        }
    }

    getCurrentGameState() {
        return {
            currentScreen: this.currentScreen,
            gameSession: this.gameSession?.id || null,
            currentPlayer: this.currentPlayer,
            currentRound: this.currentRound,
            hasActiveDrag: this.dragState.isDragging
        };
    }

    // ==================== ATAJOS DE TECLADO ==================== 
    handleKeyboardShortcuts(event) {
        // Solo procesar atajos si no estamos en un input
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        const { key, ctrlKey, altKey } = event;
        
        switch (true) {
            case ctrlKey && key === 's':
                event.preventDefault();
                this.saveGameState();
                this.showToast('Estado guardado', 'success', 2000);
                break;
                
            case ctrlKey && key === 'h':
                event.preventDefault();
                this.showHelp();
                break;
                
            case key === 'Escape':
                event.preventDefault();
                const popups = document.querySelectorAll('.popup-overlay');
                if (popups.length > 0) {
                    this.closePopup(popups[popups.length - 1]);
                } else if (this.currentScreen === 'partida') {
                    this.showGameMenu();
                }
                break;
                
            case altKey && key === 'm':
                event.preventDefault();
                if (this.currentScreen === 'partida') {
                    this.showOpponentMap();
                }
                break;
                
            case key === 'F1':
                event.preventDefault();
                this.showHelp();
                break;
        }
    }

    // ==================== PWA FEATURES ==================== 
    initializePWA() {
        // Registrar Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('✅ Service Worker registrado:', registration);
                })
                .catch(error => {
                    console.error('❌ Error registrando Service Worker:', error);
                });
        }
        
        // Manejar eventos PWA
        window.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();
            this.deferredPrompt = event;
            this.showInstallPrompt();
        });
        
        // Detectar si ya está instalado
        window.addEventListener('appinstalled', () => {
            console.log('📱 App instalada como PWA');
            this.showToast('¡App instalada correctamente!', 'success');
        });
    }

    showInstallPrompt() {
        const installBanner = document.createElement('div');
        installBanner.className = 'install-banner';
        installBanner.innerHTML = `
            <div class="install-content">
                <span>¿Instalar Draftosaurus en tu dispositivo?</span>
                <div class="install-buttons">
                    <button class="btn btn-primary btn-sm" onclick="app.installPWA()">Instalar</button>
                    <button class="btn btn-secondary btn-sm" onclick="app.dismissInstall()">Ahora no</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(installBanner);
        
        setTimeout(() => {
            installBanner.classList.add('show');
        }, 100);
    }

    async installPWA() {
        if (!this.deferredPrompt) return;
        
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('✅ Usuario aceptó instalar PWA');
        } else {
            console.log('❌ Usuario rechazó instalar PWA');
        }
        
        this.deferredPrompt = null;
        this.dismissInstall();
    }

    dismissInstall() {
        const banner = document.querySelector('.install-banner');
        if (banner) {
            banner.classList.remove('show');
            setTimeout(() => {
                if (banner.parentElement) {
                    banner.parentElement.removeChild(banner);
                }
            }, 300);
        }
    }

    // ==================== DEBUG TOOLS ==================== 
    enableDebugMode() {
        this.debug.enabled = true;
        console.log('🔧 Modo debug activado');
        
        // Añadir herramientas de debug al DOM
        this.createDebugPanel();
        
        // Atajos de debug
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                this.toggleDebugPanel();
            }
        });
    }

    createDebugPanel() {
        const panel = document.createElement('div');
        panel.id = 'debug-panel';
        panel.className = 'debug-panel';
        panel.innerHTML = `
            <div class="debug-header">
                <h4>🔧 Debug Panel</h4>
                <button onclick="app.toggleDebugPanel()">✕</button>
            </div>
            <div class="debug-content">
                <div class="debug-section">
                    <h5>Estado del Juego</h5>
                    <button onclick="app.debugExportGameState()">Exportar Estado</button>
                    <button onclick="app.debugResetGame()">Reset Juego</button>
                    <button onclick="app.debugSimulateDice()">Simular Dado</button>
                </div>
                <div class="debug-section">
                    <h5>Logs</h5>
                    <button onclick="app.debugShowLogs()">Ver Logs</button>
                    <button onclick="app.debugClearLogs()">Limpiar Logs</button>
                    <button onclick="app.debugExportLogs()">Exportar Logs</button>
                </div>
                <div class="debug-section">
                    <h5>Pruebas</h5>
                    <button onclick="app.debugTestToasts()">Test Toasts</button>
                    <button onclick="app.debugTestDragDrop()">Test Drag&Drop</button>
                    <button onclick="app.debugTestValidations()">Test Validaciones</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
    }

    toggleDebugPanel() {
        const panel = document.getElementById('debug-panel');
        if (panel) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }
    }

    debugExportGameState() {
        const state = {
            gameState: this.getCurrentGameState(),
            boardState: this.boardState,
            config: this.gameConfig,
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `draftosaurus-state-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showToast('Estado exportado', 'success');
    }

    debugResetGame() {
        if (confirm('¿Resetear el juego completamente?')) {
            this.resetGameState();
            this.showScreen('lobby');
            this.showToast('Juego reseteado', 'info');
        }
    }

    debugSimulateDice() {
        const faces = Object.keys(this.gameConfig.DICE_RESTRICTIONS);
        const randomFace = faces[Math.floor(Math.random() * faces.length)];
        this.diceRestriction = this.gameConfig.DICE_RESTRICTIONS[randomFace];
        this.updateDiceRestrictionDisplay();
        this.showToast(`Dado simulado: ${this.getRestrictionText(this.diceRestriction)}`, 'info');
    }

    debugShowLogs() {
        const logs = this.debug.logs.slice(-20); // Últimos 20 logs
        const logWindow = window.open('', '_blank', 'width=800,height=600');
        logWindow.document.write(`
            <html>
                <head><title>Debug Logs - Draftosaurus</title></head>
                <body>
                    <h1>Debug Logs</h1>
                    <pre>${JSON.stringify(logs, null, 2)}</pre>
                </body>
            </html>
        `);
    }

    debugClearLogs() {
        this.debug.logs = [];
        this.showToast('Logs limpiados', 'info');
    }

    debugExportLogs() {
        const logs = {
            logs: this.debug.logs,
            gameInfo: this.getCurrentGameState(),
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };
        
        const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `draftosaurus-logs-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showToast('Logs exportados', 'success');
    }

    debugTestToasts() {
        const types = ['success', 'error', 'warning', 'info'];
        types.forEach((type, index) => {
            setTimeout(() => {
                this.showToast(`Toast de prueba tipo ${type}`, type);
            }, index * 1000);
        });
    }

    debugTestDragDrop() {
        this.showToast('Prueba de Drag & Drop iniciada', 'info');
        // Simular highlight de targets válidos
        this.highlightValidTargets();
        setTimeout(() => {
            this.clearHighlights();
            this.showToast('Prueba de Drag & Drop completada', 'success');
        }, 3000);
    }

    debugTestValidations() {
        const testCases = [
            { enclosureId: 1, dino: { type: 'T-Rex', position: 0 } },
            { enclosureId: 2, dino: { type: 'Triceratops', position: 1 } },
            { enclosureId: 7, dino: { type: 'Stegosaurus', position: 2 } }
        ];
        
        testCases.forEach((test, index) => {
            setTimeout(() => {
                const isValid = this.isValidPlacement(test.enclosureId, test.dino);
                this.showToast(
                    `Validación ${index + 1}: ${isValid ? 'VÁLIDA' : 'INVÁLIDA'}`,
                    isValid ? 'success' : 'error'
                );
            }, index * 1000);
        });
    }

    // ==================== CLASES AUXILIARES ==================== 
    static GameTimer = class {
        constructor() {
            this.startTime = null;
            this.pausedTime = 0;
            this.isPaused = false;
        }
        
        start() {
            this.startTime = Date.now();
            this.pausedTime = 0;
            this.isPaused = false;
        }
        
        pause() {
            if (!this.isPaused && this.startTime) {
                this.isPaused = true;
                this.pausedTime += Date.now() - this.startTime;
            }
        }
        
        resume() {
            if (this.isPaused) {
                this.startTime = Date.now();
                this.isPaused = false;
            }
        }
        
        getElapsed() {
            if (!this.startTime) return 0;
            
            if (this.isPaused) {
                return this.pausedTime;
            } else {
                return this.pausedTime + (Date.now() - this.startTime);
            }
        }
    };

    static GameValidator = class {
        static validatePlacement(enclosureId, dinosaur, gameState, restriction) {
            // Implementación centralizada de validaciones
            return true; // Placeholder
        }
        
        static validateGameRules(gameState) {
            // Validar reglas generales del juego
            return { valid: true, errors: [] };
        }
        
        static calculateScore(enclosureId, dinosaurs) {
            // Cálculo centralizado de puntuaciones
            return 0; // Placeholder
        }
    };

    // ==================== MÉTODOS ESTÁTICOS AUXILIARES ==================== 
    static Utils = {
        formatNumber: (num) => {
            return new Intl.NumberFormat().format(num);
        },
        
        getRandomElement: (array) => {
            return array[Math.floor(Math.random() * array.length)];
        },
        
        shuffleArray: (array) => {
            const shuffled = [...array];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        },
        
        deepClone: (obj) => {
            return JSON.parse(JSON.stringify(obj));
        },
        
        isEqual: (obj1, obj2) => {
            return JSON.stringify(obj1) === JSON.stringify(obj2);
        }
    };
}

// ==================== INICIALIZACIÓN GLOBAL ==================== 
let app;

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    app = new AppState();
    
    // Exponer funciones globales necesarias
    window.app = app;
    
    // Configurar modo debug en desarrollo
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        app.enableDebugMode();
    }
    
    console.log('🦕 Draftosaurus cargado correctamente');
});

// ==================== MANEJO DE ERRORES NO CAPTURADOS ==================== 
window.addEventListener('error', (event) => {
    if (app) {
        app.handleGlobalError(event);
    }
});

window.addEventListener('unhandledrejection', (event) => {
    if (app) {
        app.handleUnhandledPromise(event);
    }
});

// ==================== EXTENSIONES DE FUNCIONALIDAD ==================== 
// Extensión para soporte de gamepads (opcional)
if ('getGamepads' in navigator) {
    let gamepadIndex = null;
    
    window.addEventListener('gamepadconnected', (e) => {
        gamepadIndex = e.gamepad.index;
        console.log('🎮 Gamepad conectado:', e.gamepad.id);
        app?.showToast('Gamepad conectado', 'info');
    });
    
    window.addEventListener('gamepaddisconnected', (e) => {
        gamepadIndex = null;
        console.log('🎮 Gamepad desconectado');
        app?.showToast('Gamepad desconectado', 'info');
    });
}

// Extensión para soporte de Web Share API
if ('share' in navigator) {
    AppState.prototype.shareGame = function() {
        const shareData = {
            title: 'Draftosaurus',
            text: '¡Ven a jugar Draftosaurus conmigo!',
            url: window.location.href
        };
        
        navigator.share(shareData)
            .then(() => console.log('✅ Compartido exitosamente'))
            .catch((error) => console.log('❌ Error compartiendo:', error));
    };
}

// Extensión para notificaciones push (si se necesita)
if ('Notification' in window && 'serviceWorker' in navigator) {
    AppState.prototype.requestNotificationPermission = async function() {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('✅ Permisos de notificación concedidos');
            return true;
        }
        return false;
    };
    
    AppState.prototype.showNotification = function(title, options = {}) {
        if (Notification.permission === 'granted') {
            new Notification(title, {
                icon: '/img/icon-192.png',
                badge: '/img/badge-72.png',
                ...options
            });
        }
    };
}

// ==================== EVENTO FINAL DE CARGA ==================== 
window.addEventListener('load', () => {
    console.log('🚀 Aplicación completamente cargada');
    
    // Ocultar splash screen si existe
    const splash = document.getElementById('splash-screen');
    if (splash) {
        setTimeout(() => {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
            }, 500);
        }, 1000);
    }
    
    // Precargar imágenes críticas
    if (app) {
        app.preloadCriticalImages();
    }
});

// ==================== PRECARGA DE RECURSOS ==================== 
AppState.prototype.preloadCriticalImages = function() {
    const criticalImages = [
        'img/bosque.jpg',
        'img/dado-baños.png',
        'img/dado-huella.png',
        'img/dado-no-trex.png',
        'img/dado-cafe.png',
        'img/dado-bosque.png',
        'img/dado-rocas.png'
    ];
    
    criticalImages.forEach(src => {
        const img = new Image();
        img.src = src;
    });
    
    console.log('🖼️ Imágenes críticas precargadas');
};

// ==================== EXPORTACIÓN PARA TESTING ==================== 
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AppState };
}

console.log('📝 app.js completamente cargado - Versión 1.0.0');

// --- Hotfix solo para debug.html: forzar mostrar login si no hay sesión ---
(function debugForceLogin() {
  try {
    const isDebug = location.pathname.endsWith('debug.html');
    if (!isDebug) return;

    // Detectar si hay sesión (adaptalo si tenés otro getter)
    const hasSession = !!(window.AppState?.session || window.AppState?.get?.('session'));

    // Router de pantallas: carga -> login
    const mostrarPantalla = (id) => {
      ['pantalla-carga','pantalla-login','pantalla-tablero','pantalla-lobby'].forEach(k => {
        const el = document.getElementById(k);
        if (!el) return;
        el.style.display = (k === id) ? 'flex' : 'none';
      });
    };

    if (!hasSession) {
      // Asegurar que login quede visible y 'carga' oculta
      mostrarPantalla('pantalla-login');

      // (Opcional) reflejar también en el state persistido
      try {
        const key = 'draftosaurus_state';
        const prev = JSON.parse(localStorage.getItem(key) || '{}');
        const next = {
          ...prev,
          gameState: {
            ...(prev.gameState || {}),
            currentScreen: 'login'
          }
        };
        localStorage.setItem(key, JSON.stringify(next));
      } catch (e) { /* sin ruido si falla */ }
    }
  } catch (e) {
    console.warn('debugForceLogin error:', e);
  }
})();
