// ==================== CONFIGURACIÓN DE RUTAS ==================== 
const API_BASE_URL = '/Draftosaurus - Devance'; // Cambiar por tu carpeta

// ==================== SISTEMA DE MANEJO DE ESTADOS ==================== 
class AppState {
    constructor() {
        this.currentScreen = 'carga';
        this.user = null;
        this.loading = false;
        this.gameSession = null;
        this.dadoSeleccionado = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupFormValidation();
        this.setupAccessibility();
        this.setupBirthdateField();
        this.setupFormClickHandlers();

        // Simular carga inicial y luego ir a login
        setTimeout(() => this.showScreen('login'), 1000);
    }

    // ==================== EVENT BINDING ==================== 
    bindEvents() {
        document.addEventListener('click', this.handleClick.bind(this));
        document.addEventListener('submit', this.handleSubmit.bind(this));
        document.addEventListener('keydown', this.handleKeydown.bind(this));
    }

    handleClick(e) {
        const target = e.target.closest('[id]');
        if (!target) return;

        const actions = {
            'link-registro': () => {
                e.preventDefault();
                this.showScreen('registro');
            },
            'link-login': () => {
                e.preventDefault();
                this.showScreen('login');
            },
            'btn-logout': () => this.logout(),
            'btn-jugar-app': () => this.showScreen('jugadores'),
            'btn-agregar-jugador': () => this.showToast('Solo se permiten 2 jugadores', 'info'),
            'btn-volver-jugadores': () => this.showScreen('lobby'),
            'btn-modo-asistente': () => this.showToast('Modo asistente activado', 'info'),
            'btn-comenzar-juego': () => this.iniciarJuego(),
            'btn-limpiar-partidas': () => this.limpiarPartidas(), // Nuevo botón
            'btn-empezar-turno': () => this.empezarTurno(),
            'btn-continuar-turno': () => this.continuarTurno()
        };

        if (actions[target.id]) {
            actions[target.id]();
        }
    }

    handleSubmit(e) {
        e.preventDefault();
        const form = e.target;

        const formActions = {
            'login-form': () => this.handleLogin(form),
            'register-form': () => this.handleRegister(form),
            'form-jugadores': () => this.handleJugadoresSubmit(form)
        };

        if (formActions[form.id]) {
            formActions[form.id]();
        }
    }

    handleKeydown(e) {
        if (e.key === 'Escape') {
            this.hideToasts();
        }
    }

    // ==================== MANEJO DE LOGIN ==================== 
    async handleLogin(form) {
        const username = form.querySelector('#login-username').value.trim();
        const password = form.querySelector('#login-password').value.trim();

        this.clearFormErrors(form);

        if (!this.validateLoginForm(username, password, form)) {
            return;
        }

        this.setLoading(true);

        try {
            const response = await this.apiRequest('/api/auth/login.php', {
                method: 'POST',
                body: { username, password }
            });

            if (response.success) {
                this.user = response.user;
                this.showScreen('lobby');
                this.updateLobbyData(response.user);
                this.showToast('¡Bienvenido de vuelta!', 'success');
            } else {
                this.showToast(response.message || 'Error al iniciar sesión', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showToast('Error de conexión', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    validateLoginForm(username, password, form) {
        if (!username) {
            this.showFieldError(form, '#login-username', 'Por favor ingresa tu usuario');
            return false;
        }

        if (username.length < 3 || username.length > 20) {
            this.showFieldError(form, '#login-username', 'El usuario debe tener entre 3 y 20 caracteres');
            return false;
        }

        if (!password) {
            this.showFieldError(form, '#login-password', 'Por favor ingresa tu contraseña');
            return false;
        }

        return true;
    }

    // ==================== MANEJO DE REGISTRO ==================== 
    async handleRegister(form) {
        const formData = this.getRegisterFormData(form);

        this.clearFormErrors(form);

        if (!this.validateRegisterForm(formData, form)) {
            return;
        }

        this.setLoading(true);

        try {
            const response = await this.apiRequest('/api/auth/register.php', {
                method: 'POST',
                body: formData
            });

            if (response.success) {
                this.user = response.user;
                this.showScreen('lobby');
                this.updateLobbyData(response.user);
                this.showToast('¡Cuenta creada exitosamente!', 'success');
            } else {
                this.showToast(response.message || 'Error al crear la cuenta', 'error');
            }
        } catch (error) {
            console.error('Register error:', error);
            this.showToast('Error de conexión', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    getRegisterFormData(form) {
        return {
            username: form.querySelector('#register-username').value.trim(),
            email: form.querySelector('#register-email').value.trim(),
            birthdate: form.querySelector('#register-fecha')?.value || '',
            password: form.querySelector('#register-password').value.trim(),
            passwordConfirm: form.querySelector('#register-password-confirm').value.trim()
        };
    }

    validateRegisterForm(data, form) {
        const validations = [
            {
                condition: !data.username,
                field: '#register-username',
                message: 'Por favor ingresa tu nombre de usuario'
            },
            {
                condition: data.username.length < 3 || data.username.length > 20,
                field: '#register-username',
                message: 'El nombre debe tener entre 3 y 20 caracteres'
            },
            {
                condition: !data.email,
                field: '#register-email',
                message: 'Por favor ingresa tu email'
            },
            {
                condition: !this.validateEmail(data.email),
                field: '#register-email',
                message: 'Ingresa un email válido'
            },
            {
                condition: !data.birthdate,
                field: '#register-fecha',
                message: 'Por favor ingresá tu fecha de nacimiento'
            },
            {
                condition: this.isFutureDate(data.birthdate),
                field: '#register-fecha',
                message: 'La fecha de nacimiento no puede ser futura'
            },
            {
                condition: this.isUnderAge(data.birthdate, 8),
                field: '#register-fecha',
                message: 'Debes tener al menos 8 años para registrarte'
            },
            {
                condition: !data.password,
                field: '#register-password',
                message: 'Por favor ingresa tu contraseña'
            },
            {
                condition: data.password.length < 6,
                field: '#register-password',
                message: 'La contraseña debe tener al menos 6 caracteres'
            },
            {
                condition: !data.passwordConfirm,
                field: '#register-password-confirm',
                message: 'Por favor confirma tu contraseña'
            },
            {
                condition: data.password !== data.passwordConfirm,
                field: '#register-password-confirm',
                message: 'Las contraseñas no coinciden'
            }
        ];

        for (const validation of validations) {
            if (validation.condition) {
                this.showFieldError(form, validation.field, validation.message);
                return false;
            }
        }

        return true;
    }

    // ==================== NAVEGACIÓN DE PANTALLAS ==================== 
    showScreen(screenName) {
        // Ocultar todas las pantallas
        document.querySelectorAll('.pantalla, .pantalla-inicio').forEach(screen => {
            screen.style.display = 'none';
        });

        // Mostrar la pantalla solicitada
        const screen = document.getElementById(`pantalla-${screenName}`);
        if (screen) {
            screen.style.display = screenName === 'carga' ? 'flex' : 'block';
            this.animateScreenElements(screen);
        }

        this.currentScreen = screenName;

        // Configuraciones específicas por pantalla
        this.handleScreenSpecificSetup(screenName, screen);
    }

    animateScreenElements(screen) {
        const animatedElements = screen.querySelectorAll('.fade-in, .fade-in-up');
        animatedElements.forEach((el, index) => {
            setTimeout(() => {
                el.style.animationDelay = `${index * 100}ms`;
                el.classList.add('animated');
            }, 100);
        });
    }

    handleScreenSpecificSetup(screenName, screen) {
        if (screenName === 'jugadores') {
            this.setupPantallaJugadores();
        }

        if (screenName === 'lobby' && this.user) {
            this.updateLobbyData(this.user);
        }
    }

    // ==================== CONFIGURACIÓN DE JUGADORES ==================== 
    setupPantallaJugadores() {
        this.loadUserData();
        this.setupGameControls();
        this.setupTipoJugadorChange();
        this.actualizarBotonComenzar();
    }

    loadUserData() {
        const input1 = document.getElementById('jugador-1');
        if (input1 && this.user?.username) {
            input1.value = this.user.username;
        }
    }

    setupGameControls() {
        const btn = document.getElementById('btn-comenzar-partida');
        if (btn) btn.disabled = true;

        const cont = document.getElementById('lista-jugadores');
        if (cont) {
            cont.addEventListener('input', () => this.actualizarBotonComenzar());
        }
    }

    setupTipoJugadorChange() {
        const radioInvitado = document.getElementById('radio-invitado');
        const radioUsuario = document.getElementById('radio-usuario');

        [radioInvitado, radioUsuario].forEach(radio => {
            if (radio) {
                radio.addEventListener('change', () => {
                    if (radio.checked) {
                        this.updatePlayerType(radio.value);
                    }
                });
            }
        });

        document.querySelectorAll('.radio-option').forEach(label => {
            label.addEventListener('click', (e) => {
                e.stopPropagation();
                const input = label.querySelector('input[type="radio"]');
                if (input) {
                    input.checked = true;
                    this.updatePlayerType(input.value);
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        });
    }

    updatePlayerType(tipo) {
        const avatarImg = document.getElementById('avatar-jugador-2');
        const nombreInput = document.getElementById('jugador-2');

        if (tipo === 'invitado') {
            if (avatarImg) avatarImg.src = 'img/invitado.png';
            if (nombreInput) {
                nombreInput.placeholder = 'Ingrese nombre de jugador #2';
                nombreInput.value = '';
            }
        } else if (tipo === 'usuario') {
            if (avatarImg) avatarImg.src = 'img/foto_usuario-2.png';
            if (nombreInput) {
                nombreInput.placeholder = 'Nombre de usuario existente';
                nombreInput.value = '';
            }
        }

        this.actualizarBotonComenzar();
    }

    actualizarBotonComenzar() {
        const j2 = document.getElementById('jugador-2');
        const btn = document.getElementById('btn-comenzar-partida');

        if (!j2 || !btn) return;

        btn.disabled = j2.value.trim() === '';
    }

    // ==================== MANEJO DE JUGADORES ==================== 
    async handleJugadoresSubmit(form) {
        const j1 = form.querySelector('#jugador-1');
        const j2 = form.querySelector('#jugador-2');
        const tipoJugador = form.querySelector('input[name="tipo-jugador-2"]:checked');

        if (!this.validatePlayersForm(j1, j2)) {
            return;
        }

        const gameData = {
            player1: {
                id: this.user.id,
                name: j1.value.trim(),
                type: 'registered'
            },
            player2: {
                name: j2.value.trim(),
                type: tipoJugador ? tipoJugador.value : 'invitado'
            }
        };

        this.setLoading(true);

        try {
            const response = await this.apiRequest('/api/game/create.php', {
                method: 'POST',
                body: gameData
            });

            if (response.success) {
                this.gameSession = response.game;
                this.showToast('Iniciando partida...', 'success');
                this.iniciarAnimacionDado();
            } else {
                this.showToast(response.message || 'Error al crear la partida', 'error');
            }
        } catch (error) {
            console.error('Game creation error:', error);
            this.showToast('Error de conexión', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    validatePlayersForm(j1, j2) {
        if (!j2 || !j2.value.trim()) {
            this.showFieldError(document.getElementById('form-jugadores'), '#jugador-2', 'Ingresa el nombre del segundo jugador');
            return false;
        }
        return true;
    }

    // ==================== LÓGICA DEL DADO ==================== 
    async iniciarAnimacionDado() {
        this.showScreen('dado-animacion');
        
        setTimeout(async () => {
            await this.animarDado();
        }, 500);
    }

    async animarDado() {
        const dadoImg = document.getElementById('dado-imagen');
        const dadoContainer = document.getElementById('dado-animado');
        const dadoTexto = document.querySelector('.dado-texto');

        if (!dadoImg || !dadoContainer) return;

        const dados = [
            'img/dado-1.png', 'img/dado-2.png', 'img/dado-3.png',
            'img/dado-4.png', 'img/dado-5.png', 'img/dado-6.png'
        ];

        // Animación visual del dado
        dadoContainer.classList.add('spinning');

        let contador = 0;
        const maxCambios = 15;
        const intervaloInicial = 150;

        const intervalo = setInterval(() => {
            const indiceAleatorio = Math.floor(Math.random() * dados.length);
            dadoImg.src = dados[indiceAleatorio];
            contador++;

            if (contador > maxCambios * 0.7) {
                clearInterval(intervalo);
                this.finalizarAnimacionDado(dados);
            }
        }, intervaloInicial);
    }

    async finalizarAnimacionDado(dados) {
        const dadoImg = document.getElementById('dado-imagen');
        const dadoContainer = document.getElementById('dado-animado');
        const dadoTexto = document.querySelector('.dado-texto');

        try {
            // Pedir el resultado del dado al servidor
            const response = await this.apiRequest('/api/game/roll-dice.php', {
                method: 'POST',
                body: { game_id: this.gameSession?.id }
            });

            if (response.success) {
                const dadoFinal = response.dice_result;
                this.dadoSeleccionado = dadoFinal;

                // Mostrar resultado visual
                dadoImg.src = dados[dadoFinal - 1];
                dadoContainer.classList.remove('spinning');
                dadoContainer.classList.add('final');

                if (dadoTexto) {
                    dadoTexto.textContent = '¡Dado lanzado!';
                }

                setTimeout(() => {
                    this.mostrarResultadoDado(dadoFinal, response.dice_config);
                }, 800);
            }
        } catch (error) {
            console.error('Dice roll error:', error);
            this.showToast('Error al lanzar el dado', 'error');
        }
    }

    mostrarResultadoDado(dadoNumero, config) {
        this.updatePopupContent(config);
        this.showScreen('dado-resultado');
    }

    updatePopupContent(config) {
        const dadoResultadoImg = document.getElementById('dado-resultado-img');
        const tituloDado = document.getElementById('titulo-dado');
        const descripcionDado = document.getElementById('descripcion-dado');

        if (dadoResultadoImg) dadoResultadoImg.src = config.imagen;
        if (tituloDado) tituloDado.textContent = config.titulo;
        if (descripcionDado) descripcionDado.textContent = config.descripcion;
    }

    // ==================== LIMPIAR PARTIDAS ==================== 
    async limpiarPartidas() {
        if (!confirm('¿Estás seguro de que quieres eliminar tus partidas activas?')) {
            return;
        }

        this.setLoading(true);

        try {
            const response = await this.apiRequest('/api/game/cleanup.php', {
                method: 'POST'
            });

            if (response.success) {
                this.showToast('Partidas eliminadas correctamente', 'success');
            } else {
                this.showToast(response.message || 'Error al eliminar partidas', 'error');
            }
        } catch (error) {
            console.error('Cleanup error:', error);
            this.showToast('Error de conexión', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    // ==================== INICIO DEL JUEGO ==================== 
    async iniciarJuego() {
        try {
            const response = await this.apiRequest('/api/game/start.php', {
                method: 'POST',
                body: { game_id: this.gameSession?.id }
            });

            if (response.success) {
                this.showToast('¡Partida iniciada!', 'success');
                // Cargar estado del juego y mostrar tablero
                this.loadGameState(response.game_state);
                this.showIndicadorTurno();
            }
        } catch (error) {
            console.error('Game start error:', error);
            this.showToast('Error al iniciar el juego', 'error');
        }
    }

    // ==================== TABLERO Y TURNOS ==================== 
    loadGameState(gameState) {
        this.gameState = gameState;
        this.updateGameUI();
    }

    updateGameUI() {
        if (!this.gameState) return;

        // Actualizar nombres de jugadores
        const player1Name = document.getElementById('player1-name');
        const player2Name = document.getElementById('player2-name');
        if (player1Name) player1Name.textContent = this.gameState.player1.name;
        if (player2Name) player2Name.textContent = this.gameState.player2.name;

        // Actualizar puntuaciones
        const player1Points = document.getElementById('player1-points');
        const player2Points = document.getElementById('player2-points');
        if (player1Points) player1Points.textContent = `${this.gameState.player1.score} ptos`;
        if (player2Points) player2Points.textContent = `${this.gameState.player2.score} ptos`;

        // Actualizar información de ronda
        const rondaActual = document.getElementById('ronda-actual');
        if (rondaActual) rondaActual.textContent = `Ronda ${this.gameState.current_round}`;

        // Actualizar información del dado
        if (this.gameState.current_restriction) {
            const dadoActual = document.getElementById('dado-actual');
            const dadoDescripcion = document.getElementById('dado-descripcion');
            if (dadoActual) dadoActual.src = this.gameState.current_restriction.imagen;
            if (dadoDescripcion) dadoDescripcion.textContent = this.gameState.current_restriction.titulo;
        }

        // Cargar dinosaurios en mano
        this.loadPlayerHand();
        
        // Cargar estado del tablero
        this.loadBoardState();
    }

    showIndicadorTurno() {
        const currentPlayer = this.gameState.current_player;
        const isMyTurn = currentPlayer === this.gameState.user_player_number;
        
        const turnoTitulo = document.getElementById('turno-titulo');
        const turnoDescripcion = document.getElementById('turno-descripcion');
        const turnoAvatar = document.getElementById('turno-avatar');

        if (isMyTurn) {
            if (turnoTitulo) turnoTitulo.textContent = 'Tu turno';
            if (turnoDescripcion) turnoDescripcion.textContent = 'Es tu turno para colocar un dinosaurio';
            if (turnoAvatar) turnoAvatar.src = 'img/foto_usuario-1.png';
        } else {
            const otherPlayerName = currentPlayer === 1 ? this.gameState.player1.name : this.gameState.player2.name;
            if (turnoTitulo) turnoTitulo.textContent = `Sigue ${otherPlayerName}`;
            if (turnoDescripcion) turnoDescripcion.textContent = 'Esperando al otro jugador...';
            if (turnoAvatar) turnoAvatar.src = 'img/foto_usuario-2.png';
        }

        this.showScreen('turno');
    }

    empezarTurno() {
        this.showScreen('tablero');
        this.initializeDragDrop();
    }

    loadPlayerHand() {
        const dinosauriosContainer = document.querySelector('.dinosaurios');
        if (!dinosauriosContainer || !this.gameState) return;

        const currentPlayerNumber = this.gameState.user_player_number;
        let playerHand = [];
        
        // Verificar que existe la mano del jugador
        if (this.gameState.player1 && this.gameState.player1.hand && currentPlayerNumber === 1) {
            playerHand = this.gameState.player1.hand;
        } else if (this.gameState.player2 && this.gameState.player2.hand && currentPlayerNumber === 2) {
            playerHand = this.gameState.player2.hand;
        }
        
        dinosauriosContainer.innerHTML = '<h3 class="titulos-accesibles">Dinosaurios para colocar</h3>';

        // Solo procesar si hay mano del jugador
        if (playerHand && Array.isArray(playerHand)) {
            playerHand.forEach((dinosaur, index) => {
                if (dinosaur && !dinosaur.is_played) {
                    const dinoImg = document.createElement('img');
                    dinoImg.src = dinosaur.icon || 'img/dino-default.png';
                    dinoImg.id = `dino-${dinosaur.type_id}-${index}`;
                    dinoImg.className = 'dinosaurio';
                    dinoImg.draggable = true;
                    dinoImg.alt = dinosaur.name || 'Dinosaurio';
                    dinoImg.title = `${dinosaur.name || 'Dinosaurio'} - Arrastra para colocar`;
                    dinoImg.width = 60;
                    dinoImg.height = 60;
                    dinoImg.tabIndex = 0;
                    dinoImg.dataset.dinosaurTypeId = dinosaur.type_id;
                    dinoImg.dataset.handPosition = dinosaur.position;
                    dinoImg.dataset.menuSrc = dinosaur.icon || 'img/dino-default.png';
                    dinoImg.dataset.boardSrc = dinosaur.icon || 'img/dino-default.png';

                    dinosauriosContainer.appendChild(dinoImg);
                }
            });
        } else {
            // Si no hay dinosaurios, mostrar mensaje
            const mensaje = document.createElement('p');
            mensaje.textContent = 'No hay dinosaurios disponibles';
            mensaje.style.color = 'white';
            mensaje.style.textAlign = 'center';
            dinosauriosContainer.appendChild(mensaje);
        }
    }

    loadBoardState() {
        if (!this.gameState) return;

        // Limpiar recintos
        document.querySelectorAll('.recinto').forEach(recinto => {
            const dinosaurios = recinto.querySelectorAll('.dinosaurio');
            dinosaurios.forEach(dino => dino.remove());
        });

        // Cargar dinosaurios del jugador actual
        const currentPlayerNumber = this.gameState.user_player_number;
        let boardState = [];
        
        // Verificar que existe el estado del tablero
        if (this.gameState.player1 && this.gameState.player1.board && currentPlayerNumber === 1) {
            boardState = this.gameState.player1.board;
        } else if (this.gameState.player2 && this.gameState.player2.board && currentPlayerNumber === 2) {
            boardState = this.gameState.player2.board;
        }

        // Solo procesar si hay datos del tablero
        if (boardState && Array.isArray(boardState)) {
            boardState.forEach(placement => {
                const recinto = document.querySelector(`[data-enclosure-id="${placement.enclosure_id}"]`);
                if (recinto && placement.dinosaur) {
                    const dinoImg = document.createElement('img');
                    dinoImg.src = placement.dinosaur.icon || 'img/dino-default.png';
                    dinoImg.className = 'dinosaurio';
                    dinoImg.alt = placement.dinosaur.name || 'Dinosaurio';
                    dinoImg.width = 30;
                    dinoImg.height = 30;
                    
                    recinto.appendChild(dinoImg);
                }
            });
        }

        // Aplicar restricciones del dado
        this.applyDiceRestrictions();
    }

    applyDiceRestrictions() {
        // Limpiar restricciones previas
        document.querySelectorAll('.recinto').forEach(recinto => {
            recinto.classList.remove('bloqueado');
        });

        if (!this.gameState.current_restriction || 
            this.gameState.restricted_player !== this.gameState.user_player_number) {
            return;
        }

        const restriction = this.gameState.current_restriction;
        
        switch (restriction.restriction_type) {
            case 'zone':
                // Bloquear recintos que no estén en la zona permitida
                document.querySelectorAll('.recinto').forEach(recinto => {
                    const zone = recinto.dataset.zone;
                    if (zone !== restriction.restriction_value && zone !== 'rio') {
                        recinto.classList.add('bloqueado');
                    }
                });
                break;
                
            case 'empty':
                // Bloquear recintos que no estén vacíos
                document.querySelectorAll('.recinto').forEach(recinto => {
                    const hasDinosaurs = recinto.querySelectorAll('.dinosaurio').length > 0;
                    if (hasDinosaurs && recinto.dataset.zone !== 'rio') {
                        recinto.classList.add('bloqueado');
                    }
                });
                break;
                
            case 'no_trex':
                // Bloquear recintos que tengan T-Rex
                document.querySelectorAll('.recinto').forEach(recinto => {
                    const hasTrex = Array.from(recinto.querySelectorAll('.dinosaurio')).some(dino => 
                        dino.alt && dino.alt.toLowerCase().includes('t-rex')
                    );
                    if (hasTrex && recinto.dataset.zone !== 'rio') {
                        recinto.classList.add('bloqueado');
                    }
                });
                break;
        }
    }

    initializeDragDrop() {
        // Limpiar listeners previos
        this.cleanupDragDrop();

        // Configurar drag & drop
        const dinosaurios = document.querySelectorAll('.menu_partida .dinosaurio');
        const recintos = document.querySelectorAll('.recinto:not(.bloqueado)');

        dinosaurios.forEach(dino => {
            dino.addEventListener('dragstart', this.handleDragStart.bind(this));
        });

        recintos.forEach(recinto => {
            recinto.addEventListener('dragover', this.handleDragOver.bind(this));
            recinto.addEventListener('drop', this.handleDrop.bind(this));
            recinto.addEventListener('click', this.handleRecintoClick.bind(this));
        });
    }

    handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.id);
        e.target.classList.add('dragging');
    }

    handleDragOver(e) {
        e.preventDefault();
        e.target.classList.add('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        e.target.classList.remove('drag-over');
        
        const dinoId = e.dataTransfer.getData('text/plain');
        const dinosaurio = document.getElementById(dinoId);
        
        if (dinosaurio && this.validatePlacement(dinosaurio, e.target)) {
            this.placeDinosaur(dinosaurio, e.target);
        }
    }

    handleRecintoClick(e) {
        const selectedDino = document.querySelector('.dinosaurio.selected');
        if (selectedDino && this.validatePlacement(selectedDino, e.target)) {
            this.placeDinosaur(selectedDino, e.target);
        }
    }

    validatePlacement(dinosaurio, recinto) {
        // Verificar que no esté bloqueado
        if (recinto.classList.contains('bloqueado')) {
            this.showToast('No puedes colocar en esta zona restringida', 'error');
            return false;
        }

        // Verificar capacidad
        const capacity = parseInt(recinto.dataset.capacity);
        const currentCount = recinto.querySelectorAll('.dinosaurio').length;
        
        if (currentCount >= capacity && capacity !== 999) {
            this.showToast('Este recinto está lleno', 'error');
            return false;
        }

        return true;
    }

    async placeDinosaur(dinosaurio, recinto) {
        const dinosaurTypeId = parseInt(dinosaurio.dataset.dinosaurTypeId);
        const handPosition = parseInt(dinosaurio.dataset.handPosition);
        const enclosureId = parseInt(recinto.dataset.enclosureId);

        try {
            const response = await this.apiRequest('/api/game/place-dinosaur.php', {
                method: 'POST',
                body: {
                    game_id: this.gameSession.id,
                    enclosure_id: enclosureId,
                    dinosaur_type_id: dinosaurTypeId,
                    hand_position: handPosition
                }
            });

            if (response.success) {
                // Mover dinosaurio visualmente
                const boardSrc = dinosaurio.dataset.boardSrc;
                if (boardSrc) dinosaurio.src = boardSrc;
                
                dinosaurio.className = 'dinosaurio';
                dinosaurio.draggable = false;
                dinosaurio.style.width = '30px';
                dinosaurio.style.height = '30px';
                
                recinto.appendChild(dinosaurio);
                
                // Habilitar botón continuar
                const btnContinuar = document.getElementById('btn-continuar-turno');
                if (btnContinuar) btnContinuar.disabled = false;

                this.showToast('Dinosaurio colocado correctamente', 'success');
            } else {
                this.showToast(response.message || 'Error al colocar dinosaurio', 'error');
            }
        } catch (error) {
            console.error('Placement error:', error);
            this.showToast('Error de conexión', 'error');
        }
    }

    async continuarTurno() {
        // Verificar si quedan dinosaurios
        const remainingDinos = document.querySelectorAll('.menu_partida .dinosaurio').length;
        
        if (remainingDinos > 0) {
            // Lanzar dado para el siguiente jugador
            this.showScreen('dado-animacion');
            setTimeout(() => this.animarDado(), 500);
        } else {
            // Fin de ronda
            this.showToast('Fin de ronda', 'info');
            // Aquí iría la lógica de fin de ronda
        }
    }

    cleanupDragDrop() {
        document.querySelectorAll('.dinosaurio').forEach(dino => {
            dino.classList.remove('dragging', 'selected');
        });
        
        document.querySelectorAll('.recinto').forEach(recinto => {
            recinto.classList.remove('drag-over');
        });
    }

    // ==================== LOBBY DATA ==================== 
    updateLobbyData(user) {
        const nameElement = document.querySelector('#pantalla-lobby .titulo--lg');
        if (nameElement) {
            nameElement.textContent = user.name || user.username.toUpperCase();
        }

        // Actualizar estadísticas si están disponibles
        if (user.stats) {
            const partidasGanadas = document.getElementById('partidas-ganadas');
            const partidasPerdidas = document.getElementById('partidas-perdidas');
            
            if (partidasGanadas) partidasGanadas.textContent = user.stats.won || 0;
            if (partidasPerdidas) partidasPerdidas.textContent = user.stats.lost || 0;
        }
    }

    // ==================== API REQUESTS ==================== 
    async apiRequest(url, options = {}) {
        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'same-origin', // ¡CRÍTICO! Incluir cookies de sesión
            ...options
        };

        if (config.body && config.method !== 'GET') {
            config.body = JSON.stringify(config.body);
        }

        // Construir URL completa
        const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
        
        console.log('API Request:', fullUrl, config); // Debug
        console.log('Request body:', config.body); // Debug del body
        
        try {
            const response = await fetch(fullUrl, config);
            
            console.log('Response status:', response.status); // Debug del status
            
            if (!response.ok) {
                // Intentar leer el error del servidor
                const errorText = await response.text();
                console.error('Server error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('API Response:', data); // Debug
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // ==================== SISTEMA DE FORMULARIOS ==================== 
    setupFormValidation() {
        const inputs = document.querySelectorAll('.form-input');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                if (input.classList.contains('error')) {
                    this.clearFieldError(input);
                }
            });
        });
    }

    setupFormClickHandlers() {
        document.querySelectorAll('.form-group').forEach(group => {
            const input = group.querySelector('.form-input');
            const tipoJugadorSelector = group.querySelector('.tipo-jugador-selector');

            if (input && !input.hasAttribute('readonly') && !tipoJugadorSelector) {
                group.addEventListener('click', function (e) {
                    if (e.target !== input) {
                        input.focus();
                    }
                });
            }
        });

        document.querySelectorAll('.radio-option').forEach(option => {
            option.addEventListener('click', function (e) {
                e.stopPropagation();
                const radio = this.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        });
    }

    setupAccessibility() {
        document.addEventListener('focusin', (e) => {
            if (e.target.matches('.btn, .form-input, .btn-icon')) {
                e.target.classList.add('focus-visible');
            }
        });

        document.addEventListener('focusout', (e) => {
            e.target.classList.remove('focus-visible');
        });

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.documentElement.style.setProperty('--transition-base', '0ms');
            document.documentElement.style.setProperty('--transition-fast', '0ms');
        }
    }

    setupBirthdateField() {
        const fechaInput = document.querySelector('#register-fecha');
        if (!fechaInput) return;

        const hoy = new Date();
        const yyyy = hoy.getFullYear();
        const mm = String(hoy.getMonth() + 1).padStart(2, '0');
        const dd = String(hoy.getDate()).padStart(2, '0');

        fechaInput.max = `${yyyy}-${mm}-${dd}`;

        const fechaMinima = new Date();
        fechaMinima.setFullYear(fechaMinima.getFullYear() - 100);
        const yyyyMin = fechaMinima.getFullYear();
        const mmMin = String(fechaMinima.getMonth() + 1).padStart(2, '0');
        const ddMin = String(fechaMinima.getDate()).padStart(2, '0');

        fechaInput.min = `${yyyyMin}-${mmMin}-${ddMin}`;
    }

    // ==================== MANEJO DE ERRORES ==================== 
    clearFormErrors(form) {
        form.querySelectorAll('.form-input').forEach(input => {
            this.clearFieldError(input);
        });
    }

    clearFieldError(input) {
        input.classList.remove('error');
        input.setAttribute('aria-invalid', 'false');
    }

    showFieldError(form, selector, message) {
        const field = form.querySelector(selector);
        if (field) {
            field.classList.add('error');
            field.setAttribute('aria-invalid', 'true');
            field.focus();
        }
        this.showToast(message, 'error');
    }

    // ==================== SISTEMA DE LOADING ==================== 
    setLoading(isLoading) {
        this.loading = isLoading;
        const buttons = document.querySelectorAll('.btn');

        buttons.forEach(btn => {
            if (isLoading) {
                btn.classList.add('btn--loading');
                btn.disabled = true;
            } else {
                btn.classList.remove('btn--loading');
                btn.disabled = false;
            }
        });
    }

    // ==================== SISTEMA DE TOASTS ==================== 
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = this.createToastElement(message, type);
        container.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                this.removeToast(toast);
            }
        }, 5000);
    }

    createToastElement(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast--${type} fade-in`;
        toast.innerHTML = `
            <div class="toast__content">
                <span class="toast__message">${message}</span>
                <button class="toast__close" aria-label="Cerrar notificación">&times;</button>
            </div>
        `;

        toast.querySelector('.toast__close').addEventListener('click', () => {
            this.removeToast(toast);
        });

        return toast;
    }

    removeToast(toast) {
        toast.classList.add('fade-out');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }

    hideToasts() {
        document.querySelectorAll('.toast').forEach(toast => {
            this.removeToast(toast);
        });
    }

    // ==================== UTILIDADES ==================== 
    logout() {
        this.user = null;
        this.gameSession = null;
        this.showScreen('login');
        this.showToast('Sesión cerrada', 'info');
    }

    validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    isFutureDate(dateString) {
        if (!dateString) return false;
        const hoy = new Date();
        const fechaNac = new Date(dateString);
        return fechaNac > new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    }

    isUnderAge(dateString, minAge) {
        if (!dateString) return false;
        const fechaMinima = new Date();
        fechaMinima.setFullYear(fechaMinima.getFullYear() - minAge);
        const fechaNac = new Date(dateString);
        return fechaNac > fechaMinima;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ==================== INICIALIZACIÓN ==================== 
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AppState();
});