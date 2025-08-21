// ==================== SISTEMA DE MANEJO DE ESTADOS - PARTE 1 ==================== 
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
                1: 'baños',
                2: 'huella',
                3: 'no_trex',
                4: 'cafe',
                5: 'bosque',
                6: 'rocas'
            },
            DINOSAUR_TYPES: ['T-Rex', 'Triceratops', 'Stegosaurus', 'Velociraptor', 'Diplodocus', 'Parasaurolophus']
        };
        
        this.initializeEventListeners();
    }

    // ==================== INICIALIZACIÓN ==================== 
    initializeEventListeners() {
        document.addEventListener('DOMContentLoaded', () => this.init());
        window.addEventListener('beforeunload', (e) => this.handleBeforeUnload(e));
        window.addEventListener('error', (e) => this.handleGlobalError(e));
        window.addEventListener('unhandledrejection', (e) => this.handleUnhandledPromise(e));
    }

    async init() {
        console.log('🦕 Iniciando Draftosaurus...');
        this.showScreen('carga');
        
        try {
            // Simular progreso de carga
            this.updateProgress(10);
            
            // Verificar sesión existente
            await this.checkExistingSession();
            this.updateProgress(40);
            
            // Cargar configuración
            await this.loadGameConfiguration();
            this.updateProgress(70);
            
            // Inicializar PWA
            this.initializePWA();
            this.updateProgress(100);
            
            // Mostrar pantalla de login después de un delay
            setTimeout(() => {
                this.showScreen('login');
                console.log('✅ Draftosaurus iniciado correctamente');
            }, 1500);
            
        } catch (error) {
            console.error('❌ Error al iniciar:', error);
            this.showToast('Error al inicializar el juego', 'error');
            
            // Mostrar login de todas formas después de un delay
            setTimeout(() => {
                this.showScreen('login');
            }, 2000);
        }
    }

    updateProgress(percent) {
        const progressBar = document.getElementById('barra-progreso');
        if (progressBar) {
            progressBar.style.width = percent + '%';
            progressBar.setAttribute('aria-valuenow', percent);
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
        } else {
            console.error(`❌ No se encontró la pantalla: pantalla-${screenName}`);
        }
        
        this.currentScreen = screenName;
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

    setupGameButtons() {
        // Botón finalizar turno
        const finishTurnBtn = document.getElementById('finish-turn-btn');
        if (finishTurnBtn) {
            finishTurnBtn.onclick = () => this.finishTurn();
            finishTurnBtn.style.display = 'none';
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
            // CORREGIDO: Usar la ruta correcta de la API
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
        const birthdate = document.getElementById('register-fecha').value;
        
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
        
        if (!birthdate) {
            this.showToast('La fecha de nacimiento es requerida', 'error');
            return;
        }
        
        this.setLoading(true);
        
        try {
            // CORREGIDO: Usar la ruta correcta de la API
            const response = await fetch('api/auth/register.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, birthdate })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showToast('¡Cuenta creada exitosamente!', 'success');
                this.showScreen('login');
                // Pre-llenar el email
                const emailInput = document.getElementById('email');
                if (emailInput) {
                    emailInput.value = email;
                }
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
                
                if (data.success && data.valid) {
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

    updateUserInfo() {
        if (!this.user) return;
        
        const userElements = document.querySelectorAll('.user-name');
        userElements.forEach(el => {
            el.textContent = this.user.username || this.user.name;
        });
        
        const avatarElements = document.querySelectorAll('.user-avatar img');
        avatarElements.forEach(el => {
            el.src = this.user.avatar || 'img/avatar-default.png';
        });
    }

    // ==================== GESTIÓN DEL JUEGO ==================== 
    async startNewGame() {
        console.log('🎮 Iniciando nueva partida...');
        
        this.setLoading(true);
        
        try {
            // Configurar jugadores (juego local)
            const player1Name = prompt('Nombre del Jugador 1:') || 'Jugador 1';
            const player2Name = prompt('Nombre del Jugador 2:') || 'Jugador 2';
            
            // CORREGIDO: Usar la ruta correcta de la API
            const response = await fetch('api/game/create.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    player1: { name: player1Name },
                    player2: { name: player2Name, type: 'invitado' }
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.gameSession = data.game;
                
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
            // Simular repartir dinosaurios
            const dinosaurTypes = this.gameConfig.DINOSAUR_TYPES;
            
            // Repartir 6 dinosaurios aleatorios a cada jugador
            this.boardState.player1Hand = [];
            this.boardState.player2Hand = [];
            
            for (let i = 0; i < 6; i++) {
                const randomDino1 = dinosaurTypes[Math.floor(Math.random() * dinosaurTypes.length)];
                const randomDino2 = dinosaurTypes[Math.floor(Math.random() * dinosaurTypes.length)];
                
                this.boardState.player1Hand.push({ type: randomDino1 });
                this.boardState.player2Hand.push({ type: randomDino2 });
            }
            
            console.log('🦕 Dinosaurios repartidos:', {
                player1: this.boardState.player1Hand,
                player2: this.boardState.player2Hand
            });
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
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            `;
            
            overlay.innerHTML = `
                <div class="dice-container" style="text-align: center;">
                    <div class="dice-cube" id="dice-cube" style="
                        width: 150px;
                        height: 150px;
                        margin: 0 auto 20px auto;
                        animation: spin 2s linear infinite;
                    ">
                        <img src="img/dado-baños.png" alt="Dado" style="width: 100%; height: 100%;">
                    </div>
                    <p class="dice-text" style="color: white; font-size: 18px;">Lanzando dado...</p>
                </div>
            `;
            
            document.body.appendChild(overlay);
            
            setTimeout(() => {
                // Generar resultado del dado (1-6)
                const diceResult = Math.floor(Math.random() * 6) + 1;
                this.diceRestriction = this.gameConfig.DICE_RESTRICTIONS[diceResult];
                
                // Mostrar resultado
                const cube = document.getElementById('dice-cube');
                cube.style.animation = 'none';
                cube.innerHTML = `<img src="img/dado-${this.diceRestriction}.png" alt="Dado resultado" style="width: 100%; height: 100%;">`;
                
                document.querySelector('.dice-text').textContent = `Restricción: ${this.getRestrictionText(this.diceRestriction)}`;
                
                setTimeout(() => {
                    document.body.removeChild(overlay);
                    resolve();
                }, 2000);
            }, 2000);
        });
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

    finishTurn() {
        console.log(`🔄 Finalizando turno del jugador ${this.currentPlayer}`);
        
        // Cambiar de jugador
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        
        // Actualizar interfaz
        this.updateGameInterface();
        
        this.showToast(`Turno del ${this.currentPlayer === 1 ? 'Jugador 1' : 'Jugador 2'}`, 'info');
    }

    updateGameInterface() {
        this.updatePlayerInfo();
        this.updatePlayerHand();
        this.updateScores();
        this.updateDiceRestrictionDisplay();
    }

    updatePlayerInfo() {
        // Implementación básica
        const gameInfo = document.querySelector('.game-info');
        if (gameInfo) {
            gameInfo.innerHTML = `
                <div class="round-info">Ronda ${this.currentRound}/2</div>
                <div class="turn-info">Jugador ${this.currentPlayer}</div>
            `;
        }
    }

    updatePlayerHand() {
        // Implementación básica
        const handContainer = document.getElementById('player-hand');
        if (handContainer) {
            const currentHand = this.currentPlayer === 1 ? this.boardState.player1Hand : this.boardState.player2Hand;
            handContainer.innerHTML = currentHand.map((dino, index) => 
                `<div class="dinosaur-card" data-dino-type="${dino.type}" data-position="${index}">
                    <img src="img/dino-${dino.type.toLowerCase()}.png" alt="${dino.type}">
                    <span class="dino-name">${dino.type}</span>
                </div>`
            ).join('');
        }
    }

    updateScores() {
        // Implementación básica
        console.log('📊 Actualizando puntuaciones...');
    }

    updateDiceRestrictionDisplay() {
        const restrictionElement = document.getElementById('restriction-indicator');
        if (restrictionElement && this.diceRestriction) {
            restrictionElement.style.display = 'block';
            restrictionElement.innerHTML = `
                <strong>Restricción activa:</strong><br>
                <span id="restriction-text">${this.getRestrictionText(this.diceRestriction)}</span>
            `;
        }
    }

    // ==================== CONFIGURACIÓN DEL TABLERO ==================== 
    initializeBoard() {
        console.log('🗂️ Inicializando tablero...');
        
        const board = document.getElementById('tablero');
        if (!board) {
            console.error('❌ No se encontró el elemento tablero');
            return;
        }
        
        // Limpiar tablero
        board.innerHTML = '';
        
        // Crear estructura básica del tablero
        board.innerHTML = `
            <div class="board-message">
                <h3>Tablero de Draftosaurus</h3>
                <p>Coloca tus dinosaurios siguiendo la restricción del dado</p>
                <p><strong>Restricción actual:</strong> ${this.getRestrictionText(this.diceRestriction)}</p>
            </div>
        `;
        
        console.log('✅ Tablero inicializado');
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
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            `;
            overlay.innerHTML = `
                <div class="loading-spinner" style="text-align: center; color: white;">
                    <div class="spinner" style="
                        width: 40px;
                        height: 40px;
                        border: 4px solid #f3f3f3;
                        border-top: 4px solid #628107;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 20px auto;
                    "></div>
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
        setTimeout(() => toast.classList.add('fade-in'), 100);
        
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
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-width: 300px;
            `;
            document.body.appendChild(container);
        }
        
        return container;
    }

    createToastElement(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.style.cssText = `
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 15px;
            border-left: 4px solid ${this.getToastColor(type)};
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        toast.innerHTML = `
            <div class="toast__content" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                <div style="display: flex; gap: 8px; align-items: flex-start;">
                    <span style="font-size: 16px;">${icons[type] || icons.info}</span>
                    <div class="toast__message" style="color: #333; font-size: 14px; line-height: 1.4;">${message}</div>
                </div>
                <button class="toast__close" onclick="app.removeToast(this.closest('.toast'))" style="
                    background: none;
                    border: none;
                    color: #999;
                    cursor: pointer;
                    font-size: 18px;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                ">✕</button>
            </div>
        `;
        
        return toast;
    }

    getToastColor(type) {
        const colors = {
            success: '#22c55e',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        return colors[type] || colors.info;
    }

    removeToast(toast) {
        if (!toast || !toast.parentElement) return;
        
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';
        
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
            
            if (response.ok) {
                const text = await response.text();
                console.log('⚙️ Configuración disponible');
                
                // Intentar parsear como JSON si es posible
                try {
                    const config = JSON.parse(text);
                    Object.assign(this.gameConfig, config.data || {});
                    console.log('✅ Configuración cargada desde servidor');
                } catch (jsonError) {
                    console.log('⚠️ config.php no retorna JSON, usando configuración por defecto');
                }
            } else {
                console.warn('⚠️ config.php no disponible, usando configuración por defecto');
            }
        } catch (error) {
            console.error('Error cargando configuración:', error);
            // Usar configuración por defecto
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
        // Implementación básica del prompt de instalación
        console.log('📱 PWA installation prompt available');
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
        
        // Guardar en debug logs (si existe sistema de debug)
        if (this.debug) {
            this.debug.logs = this.debug.logs || [];
            this.debug.logs.push(errorLog);
        }
        
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
            hasUser: !!this.user
        };
    }

    // ==================== FUNCIONES AUXILIARES PARA EL JUEGO ==================== 
    displayRoundSummary() {
        const summaryContainer = document.getElementById('round-summary');
        if (!summaryContainer) return;
        
        summaryContainer.innerHTML = `
            <div class="round-summary-content">
                <h2>Resumen - Ronda ${this.currentRound}</h2>
                <div class="players-summary">
                    <div class="player-summary">
                        <h3>Jugador 1</h3>
                        <div class="score">${this.boardState.player1Score} puntos</div>
                    </div>
                    <div class="player-summary">
                        <h3>Jugador 2</h3>
                        <div class="score">${this.boardState.player2Score} puntos</div>
                    </div>
                </div>
            </div>
        `;
    }

    displayFinalResults() {
        const resultsContainer = document.getElementById('final-results');
        if (!resultsContainer) return;
        
        const totalPlayer1 = this.boardState.player1Score;
        const totalPlayer2 = this.boardState.player2Score;
        const winner = totalPlayer1 > totalPlayer2 ? 'Jugador 1' : 
                      totalPlayer1 < totalPlayer2 ? 'Jugador 2' : 'Empate';
        
        resultsContainer.innerHTML = `
            <div class="final-results-content">
                <div class="winner-announcement">
                    <h2>🏆 ${winner === 'Empate' ? '¡Empate!' : `¡${winner} Gana!`}</h2>
                    <div class="final-scores">
                        <div class="player-final-score ${totalPlayer1 >= totalPlayer2 ? 'winner' : ''}">
                            <h3>Jugador 1</h3>
                            <div class="total-score">${totalPlayer1}</div>
                        </div>
                        <div class="player-final-score ${totalPlayer2 >= totalPlayer1 ? 'winner' : ''}">
                            <h3>Jugador 2</h3>
                            <div class="total-score">${totalPlayer2}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    startNextRound() {
        console.log('🆕 Iniciando siguiente ronda...');
        this.currentRound = 2;
        this.currentPlayer = 1;
        
        // Limpiar tableros para la nueva ronda
        this.boardState.player1Board = {};
        this.boardState.player2Board = {};
        
        // Repartir nuevos dinosaurios
        this.dealDinosaurs();
        
        // Lanzar dado inicial
        this.rollDiceAndStart();
    }

    showOpponentMap() {
        console.log('🗺️ Mostrando mapa del oponente...');
        this.showToast('Función de mapa del oponente en desarrollo', 'info');
    }

    showGameMenu() {
        console.log('📋 Mostrando menú del juego...');
        this.showToast('Menú del juego en desarrollo', 'info');
    }

    showHelp() {
        console.log('❓ Mostrando ayuda...');
        this.showToast('Sistema de ayuda en desarrollo', 'info');
    }

    // ==================== FUNCIONES ESTÁTICAS AUXILIARES ==================== 
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
});

// Agregar estilos CSS dinámicos para animaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .toast.fade-in {
        transform: translateX(0) !important;
    }
    
    .loading-overlay.active {
        opacity: 1;
    }
    
    .dice-animation-overlay {
        backdrop-filter: blur(4px);
    }
`;
document.head.appendChild(style);

console.log('📄 app.js completamente cargado - Versión corregida');

