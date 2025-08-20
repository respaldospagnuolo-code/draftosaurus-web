// ==================== SISTEMA DE MANEJO DE ESTADOS ==================== 
class AppState {
    constructor() {
        this.currentScreen = 'carga';
        this.user = null;
        this.loading = false;
        this.gameSession = null;
        this.dadoSeleccionado = null;
        this.draggedCard = null;
        this.boardState = null;
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
            'btn-comenzar-juego': () => this.iniciarJuego()
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
            const response = await this.apiRequest('./api/auth/login.php', {
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
            const response = await this.apiRequest('./api/auth/register.php', {
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

        if (screenName === 'partida') {
            // Inicializar el tablero cuando se muestre la pantalla
            setTimeout(() => {
                this.setupPantallaPartida();
            }, 100);
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
            const response = await this.apiRequest('./api/game/create.php', {
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
            const response = await this.apiRequest('./api/game/roll-dice.php', {
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

    // ==================== INICIO DEL JUEGO ==================== 
    async iniciarJuego() {
        try {
            const response = await this.apiRequest('./api/game/start.php', {
                method: 'POST',
                body: { game_id: this.gameSession?.id }
            });

            if (response.success) {
                this.showToast('¡Partida iniciada!', 'success');
                this.showScreen('partida');
                // Inicializar el tablero después de mostrar la pantalla
                setTimeout(() => {
                    this.setupPantallaPartida();
                }, 100);
            }
        } catch (error) {
            this.showToast('Error al iniciar el juego', 'error');
        }
    }

    // ==================== INICIALIZACIÓN DEL TABLERO ==================== 
    setupPantallaPartida() {
        this.initializeBoardGame();
        this.setupDragAndDrop();
        this.setupBoardEventListeners();
    }

    initializeBoardGame() {
        if (!this.gameSession) return;

        // Estado inicial del juego
        this.boardState = {
            currentPlayer: 1,
            currentRound: 1,
            currentTurn: 1,
            restrictedZone: null,
            restrictedPlayer: null,
            gamePhase: 'roll_dice', // roll_dice, place_dinosaur, wait_turn
            diceResult: null,
            player1Hand: [],
            player2Hand: [],
            player1Board: {},
            player2Board: {}
        };

        this.generateInitialHands();
        this.updateBoardUI();
    }

    generateInitialHands() {
        const dinosaurTypes = [
            { id: 1, name: 'Triceratops', icon: 'img/dino-triceratops.png', class: 'dino-triceratops' },
            { id: 2, name: 'Brachiosaurus', icon: 'img/dino-brachiosaurus.png', class: 'dino-brachiosaurus' },
            { id: 3, name: 'Stegosaurus', icon: 'img/dino-stegosaurus.png', class: 'dino-stegosaurus' },
            { id: 4, name: 'Parasaurolophus', icon: 'img/dino-parasaurolophus.png', class: 'dino-parasaurolophus' },
            { id: 5, name: 'Compsognathus', icon: 'img/dino-compsognathus.png', class: 'dino-compsognathus' },
            { id: 6, name: 'T-Rex', icon: 'img/dino-trex.png', class: 'dino-trex' }
        ];

        // Generar 6 dinosaurios aleatorios para cada jugador
        for (let i = 0; i < 6; i++) {
            const randomDino1 = dinosaurTypes[Math.floor(Math.random() * dinosaurTypes.length)];
            const randomDino2 = dinosaurTypes[Math.floor(Math.random() * dinosaurTypes.length)];
            
            this.boardState.player1Hand.push({
                ...randomDino1,
                position: i + 1,
                isPlayed: false
            });
            
            this.boardState.player2Hand.push({
                ...randomDino2,
                position: i + 1,
                isPlayed: false
            });
        }

        this.renderPlayerHands();
    }

    renderPlayerHands() {
        const player1HandEl = document.getElementById('player1-hand');
        const player2HandEl = document.getElementById('player2-hand');

        if (!player1HandEl || !player2HandEl) return;

        // Renderizar mano del jugador 1
        player1HandEl.innerHTML = '';
        this.boardState.player1Hand.forEach(dino => {
            const card = document.createElement('div');
            card.className = `dinosaur-card ${dino.class} ${dino.isPlayed ? 'played' : ''}`;
            
            const img = document.createElement('img');
            img.src = dino.icon;
            img.alt = dino.name;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            card.appendChild(img);
            
            card.draggable = !dino.isPlayed && this.boardState.gamePhase === 'place_dinosaur' && this.boardState.currentPlayer === 1;
            card.dataset.type = dino.id;
            card.dataset.position = dino.position;
            player1HandEl.appendChild(card);
        });

        // Renderizar mano del jugador 2 (oculta)
        player2HandEl.innerHTML = '';
        this.boardState.player2Hand.forEach((dino, index) => {
            const card = document.createElement('div');
            card.className = `dinosaur-card hidden ${dino.isPlayed ? 'played' : ''}`;
            card.textContent = '?';
            card.draggable = false;
            player2HandEl.appendChild(card);
        });
    }

    setupDragAndDrop() {
        // Los event listeners se configurarán dinámicamente cuando se renderice la mano
        this.updateDragEventListeners();
    }

    updateDragEventListeners() {
        // Remover listeners anteriores
        document.querySelectorAll('.dinosaur-card').forEach(card => {
            card.removeEventListener('dragstart', this.handleDragStart);
            card.removeEventListener('dragend', this.handleDragEnd);
        });

        // Agregar listeners a cartas draggables
        document.querySelectorAll('.dinosaur-card[draggable="true"]').forEach(card => {
            card.addEventListener('dragstart', this.handleDragStart.bind(this));
            card.addEventListener('dragend', this.handleDragEnd.bind(this));
        });

        // Configurar drop zones
        document.querySelectorAll('.enclosure').forEach(enclosure => {
            enclosure.addEventListener('dragover', this.handleDragOver.bind(this));
            enclosure.addEventListener('dragenter', this.handleDragEnter.bind(this));
            enclosure.addEventListener('dragleave', this.handleDragLeave.bind(this));
            enclosure.addEventListener('drop', this.handleDrop.bind(this));
        });
    }

    setupBoardEventListeners() {
        const rollBtn = document.getElementById('btn-roll-dice');
        const endBtn = document.getElementById('btn-end-turn');
        
        if (rollBtn) rollBtn.addEventListener('click', this.rollBoardDice.bind(this));
        if (endBtn) endBtn.addEventListener('click', this.endBoardTurn.bind(this));
    }

    handleDragStart(e) {
        if (this.boardState.gamePhase !== 'place_dinosaur' || this.boardState.currentPlayer !== 1) {
            e.preventDefault();
            return;
        }

        this.draggedCard = e.target;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        this.draggedCard = null;
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    handleDragEnter(e) {
        e.preventDefault();
        if (this.canPlaceInEnclosure(e.currentTarget)) {
            e.currentTarget.classList.add('drag-over');
        }
    }

    handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');

        if (!this.draggedCard || !this.canPlaceInEnclosure(e.currentTarget)) {
            this.showToast('No puedes colocar aquí', 'error');
            return;
        }

        this.placeDinosaurOnBoard(this.draggedCard, e.currentTarget);
    }

    canPlaceInEnclosure(enclosure) {
        const zone = enclosure.dataset.zone;
        const capacity = enclosure.querySelector('.capacity-indicator').textContent;
        const currentCount = enclosure.querySelectorAll('.placed-dinosaur').length;

        // Verificar capacidad
        if (capacity !== '∞' && currentCount >= parseInt(capacity)) {
            return false;
        }

        // Verificar restricciones de zona
        if (this.boardState.restrictedZone && 
            this.boardState.restrictedPlayer === this.boardState.currentPlayer &&
            zone === this.boardState.restrictedZone && 
            zone !== 'rio') {
            return false;
        }

        // Validaciones específicas por tipo de recinto
        const enclosureType = enclosure.dataset.type;
        const existingDinos = Array.from(enclosure.querySelectorAll('.placed-dinosaur img'));
        
        if (enclosureType === 'bosque_iguales' && existingDinos.length > 0) {
            // En bosques de iguales, solo se permite una especie
            const firstDinoSrc = existingDinos[0]?.src;
            const draggedDinoSrc = this.draggedCard?.querySelector('img')?.src;
            if (firstDinoSrc && draggedDinoSrc && firstDinoSrc !== draggedDinoSrc) {
                return false;
            }
        }
        
        if (enclosureType === 'pradera_diferentes' && existingDinos.length > 0) {
            // En praderas diferentes, no se pueden repetir especies
            const draggedDinoSrc = this.draggedCard?.querySelector('img')?.src;
            const hasSameSpecies = existingDinos.some(img => img.src === draggedDinoSrc);
            if (hasSameSpecies) {
                return false;
            }
        }

        return true;
    }

    placeDinosaurOnBoard(card, enclosure) {
        const dinoType = parseInt(card.dataset.type);
        const position = parseInt(card.dataset.position);

        // Crear dinosaurio colocado
        const placedDino = document.createElement('div');
        placedDino.className = 'placed-dinosaur';
        
        const img = document.createElement('img');
        img.src = card.querySelector('img').src;
        img.alt = card.querySelector('img').alt;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        placedDino.appendChild(img);

        // Añadir al recinto
        enclosure.querySelector('.enclosure-content').appendChild(placedDino);

        // Actualizar estado de la mano
        const dinoInHand = this.boardState.player1Hand.find(d => d.position === position);
        if (dinoInHand) {
            dinoInHand.isPlayed = true;
        }

        // Actualizar tablero del jugador
        if (!this.boardState.player1Board[enclosure.dataset.id]) {
            this.boardState.player1Board[enclosure.dataset.id] = [];
        }
        this.boardState.player1Board[enclosure.dataset.id].push(dinoType);

        // Cambiar fase del juego
        this.boardState.gamePhase = 'wait_turn';
        const endBtn = document.getElementById('btn-end-turn');
        if (endBtn) endBtn.disabled = false;

        this.renderPlayerHands();
        this.updateBoardUI();
        this.showToast('Dinosaurio colocado correctamente', 'success');
    }

    rollBoardDice() {
        const diceResult = Math.floor(Math.random() * 6) + 1;
        this.boardState.diceResult = diceResult;

        const restrictions = [
            { zone: 'empty', text: 'No puedes colocar en recintos vacíos' },
            { zone: 'no_trex', text: 'No puedes colocar junto a T-Rex' },
            { zone: 'comidas', text: 'No puedes colocar en zona de comidas' },
            { zone: 'bosques', text: 'No puedes colocar en bosques' },
            { zone: 'praderas', text: 'No puedes colocar en praderas' },
            { zone: 'banos', text: 'No puedes colocar en zona de baños' }
        ];

        const restriction = restrictions[diceResult - 1];
        
        // La restricción afecta al jugador contrario
        const affectedPlayer = this.boardState.currentPlayer === 1 ? 2 : 1;
        this.boardState.restrictedZone = restriction.zone;
        this.boardState.restrictedPlayer = affectedPlayer;

        // Si es el primer turno (jugador que tira es 1), puede colocar libremente
        if (this.boardState.currentPlayer === 1 && this.boardState.currentTurn === 1) {
            this.boardState.restrictedPlayer = null;
        }

        // Mostrar restricción
        const restrictionEl = document.getElementById('restriction-indicator');
        const restrictionTextEl = document.getElementById('restriction-text');
        
        if (restrictionEl && restrictionTextEl) {
            if (this.boardState.restrictedPlayer === 1) {
                restrictionTextEl.textContent = restriction.text;
                restrictionEl.style.display = 'block';
                this.updateEnclosureRestrictions();
            } else {
                restrictionEl.style.display = 'none';
            }
        }

        this.boardState.gamePhase = 'place_dinosaur';
        const rollBtn = document.getElementById('btn-roll-dice');
        if (rollBtn) rollBtn.style.display = 'none';

        this.renderPlayerHands();
        this.updateBoardUI();
        this.showToast(`Dado: ${diceResult}`, 'info');
    }

    updateEnclosureRestrictions() {
        document.querySelectorAll('.enclosure').forEach(enclosure => {
            enclosure.classList.remove('restricted');
            
            if (this.boardState.restrictedPlayer === this.boardState.currentPlayer) {
                const zone = enclosure.dataset.zone;
                if (zone === this.boardState.restrictedZone && zone !== 'rio') {
                    enclosure.classList.add('restricted');
                }
            }
        });
    }

    endBoardTurn() {
        // Verificar si el jugador actual terminó sus cartas
        const currentPlayerHand = this.boardState.currentPlayer === 1 ? 
                                 this.boardState.player1Hand : this.boardState.player2Hand;
        const cardsLeft = currentPlayerHand.filter(d => !d.isPlayed).length;
        
        if (cardsLeft === 0) {
            this.checkGameEnd();
            return;
        }
        
        // Cambiar al siguiente jugador
        this.boardState.currentPlayer = this.boardState.currentPlayer === 1 ? 2 : 1;
        this.boardState.currentTurn++;

        // Si es turno del jugador 2, simular su jugada
        if (this.boardState.currentPlayer === 2) {
            this.simulateAITurn();
        } else {
            this.startPlayerTurn();
        }
    }

    simulateAITurn() {
        this.boardState.gamePhase = 'wait_turn';
        this.updateBoardUI();

        // Simular tiempo de pensamiento
        setTimeout(() => {
            this.rollBoardDice();
            
            setTimeout(() => {
                this.simulateAIPlacement();
                
                setTimeout(() => {
                    // Verificar fin de juego antes de continuar
                    this.checkGameEnd();
                    
                    if (this.boardState.currentRound <= 2) {
                        this.endBoardTurn();
                    }
                }, 1000);
            }, 1500);
        }, 1000);
    }

    simulateAIPlacement() {
        // Encontrar un recinto válido para el AI
        const availableEnclosures = Array.from(document.querySelectorAll('.enclosure'))
            .filter(enclosure => {
                const zone = enclosure.dataset.zone;
                const capacity = enclosure.querySelector('.capacity-indicator').textContent;
                const currentCount = enclosure.querySelectorAll('.placed-dinosaur').length;
                
                // Verificar capacidad
                if (capacity !== '∞' && currentCount >= parseInt(capacity)) {
                    return false;
                }
                
                // Verificar restricciones para AI
                if (this.boardState.restrictedZone && 
                    this.boardState.restrictedPlayer === 2 &&
                    zone === this.boardState.restrictedZone && 
                    zone !== 'rio') {
                    return false;
                }
                
                return true;
            });

        if (availableEnclosures.length > 0) {
            // Seleccionar recinto aleatorio
            const randomEnclosure = availableEnclosures[Math.floor(Math.random() * availableEnclosures.length)];
            
            // Seleccionar dinosaurio aleatorio del AI
            const availableDinos = this.boardState.player2Hand.filter(d => !d.isPlayed);
            if (availableDinos.length > 0) {
                const randomDino = availableDinos[Math.floor(Math.random() * availableDinos.length)];
                
                // Crear dinosaurio colocado
                const placedDino = document.createElement('div');
                placedDino.className = 'placed-dinosaur';
                
                const img = document.createElement('img');
                img.src = randomDino.icon;
                img.alt = randomDino.name;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'contain';
                placedDino.appendChild(img);
                
                randomEnclosure.querySelector('.enclosure-content').appendChild(placedDino);
                
                // Marcar como jugado
                randomDino.isPlayed = true;
                
                // Actualizar tablero del AI
                if (!this.boardState.player2Board[randomEnclosure.dataset.id]) {
                    this.boardState.player2Board[randomEnclosure.dataset.id] = [];
                }
                this.boardState.player2Board[randomEnclosure.dataset.id].push(randomDino.id);
                
                this.renderPlayerHands();
                this.showToast('El rival colocó un dinosaurio', 'info');
            }
        }
    }

    startPlayerTurn() {
        this.boardState.gamePhase = 'roll_dice';
        const rollBtn = document.getElementById('btn-roll-dice');
        const endBtn = document.getElementById('btn-end-turn');
        
        if (rollBtn) rollBtn.style.display = 'inline-block';
        if (endBtn) endBtn.disabled = true;
        
        // Limpiar restricciones visuales del turno anterior
        document.querySelectorAll('.enclosure').forEach(enclosure => {
            enclosure.classList.remove('restricted');
        });
        
        this.updateBoardUI();
    }

    // ==================== GESTIÓN DE RONDAS Y FINAL DEL JUEGO ==================== 
    checkGameEnd() {
        // Verificar si ambos jugadores terminaron sus cartas
        const player1CardsLeft = this.boardState.player1Hand.filter(d => !d.isPlayed).length;
        const player2CardsLeft = this.boardState.player2Hand.filter(d => !d.isPlayed).length;
        
        if (player1CardsLeft === 0 && player2CardsLeft === 0) {
            if (this.boardState.currentRound >= 2) {
                // Fin del juego
                this.endGame();
            } else {
                // Nueva ronda
                this.startNewRound();
            }
        }
    }

    startNewRound() {
        this.boardState.currentRound++;
        this.boardState.currentTurn = 1;
        this.boardState.currentPlayer = 1;
        this.boardState.gamePhase = 'roll_dice';
        this.boardState.restrictedZone = null;
        this.boardState.restrictedPlayer = null;
        
        // Generar nuevas manos
        this.boardState.player1Hand = [];
        this.boardState.player2Hand = [];
        this.generateInitialHands();
        
        // Limpiar restricciones
        const restrictionEl = document.getElementById('restriction-indicator');
        const rollBtn = document.getElementById('btn-roll-dice');
        const endBtn = document.getElementById('btn-end-turn');
        
        if (restrictionEl) restrictionEl.style.display = 'none';
        if (rollBtn) rollBtn.style.display = 'inline-block';
        if (endBtn) endBtn.disabled = true;
        
        this.updateBoardUI();
        this.showToast('¡Nueva ronda!', 'success');
    }

    endGame() {
        // Calcular puntuaciones finales
        const finalScores = this.calculateFinalScores();
        
        // Determinar ganador
        const winner = finalScores.player1 > finalScores.player2 ? 'Jugador 1' : 
                      finalScores.player1 < finalScores.player2 ? 'Jugador 2' : 'Empate';
        
        // Actualizar UI con resultado final
        const player1ScoreEl = document.getElementById('player1-score');
        const player2ScoreEl = document.getElementById('player2-score');
        const turnIndicator = document.getElementById('turn-indicator');
        const actionButtons = document.querySelector('.action-buttons');
        
        if (player1ScoreEl) player1ScoreEl.textContent = `${finalScores.player1} puntos`;
        if (player2ScoreEl) player2ScoreEl.textContent = `${finalScores.player2} puntos`;
        
        if (turnIndicator) {
            turnIndicator.textContent = winner === 'Empate' ? '¡Empate!' : `¡${winner} gana!`;
            turnIndicator.style.background = winner === 'Jugador 1' ? 'var(--color-primario)' : 
                                            winner === 'Jugador 2' ? 'var(--color-naranja)' : '#666';
        }
        
        // Ocultar botones de acción
        if (actionButtons) actionButtons.style.display = 'none';
        
        this.showToast(`Juego terminado - ${winner}`, 'success');
    }

    calculateFinalScores() {
        // Implementación básica de puntuación
        let player1Score = 0;
        let player2Score = 0;
        
        // Contar dinosaurios colocados por cada jugador
        Object.values(this.boardState.player1Board).forEach(enclosureDinos => {
            player1Score += enclosureDinos.length;
        });
        
        Object.values(this.boardState.player2Board).forEach(enclosureDinos => {
            player2Score += enclosureDinos.length;
        });
        
        return {
            player1: player1Score,
            player2: player2Score
        };
    }

    updateBoardUI() {
        if (!this.boardState) return;
        
        // Actualizar información del header
        const player1Name = this.user?.username || 'Jugador 1';
        const player2Name = this.gameSession?.player2?.name || 'Jugador 2';
        
        const player1NameEl = document.getElementById('player1-name');
        const player2NameEl = document.getElementById('player2-name');
        const roundInfoEl = document.getElementById('round-info');
        const turnInfoEl = document.getElementById('turn-info');
        
        if (player1NameEl) player1NameEl.textContent = player1Name;
        if (player2NameEl) player2NameEl.textContent = player2Name;
        if (roundInfoEl) roundInfoEl.textContent = `Ronda ${this.boardState.currentRound}/2`;
        if (turnInfoEl) turnInfoEl.textContent = `Turno ${this.boardState.currentTurn}`;

        // Actualizar puntuaciones actuales
        const currentScores = this.calculateCurrentScores();
        const player1ScoreEl = document.getElementById('player1-score');
        const player2ScoreEl = document.getElementById('player2-score');
        
        if (player1ScoreEl) player1ScoreEl.textContent = `${currentScores.player1} puntos`;
        if (player2ScoreEl) player2ScoreEl.textContent = `${currentScores.player2} puntos`;

        // Actualizar indicador de turno
        const turnIndicator = document.getElementById('turn-indicator');
        if (turnIndicator) {
            if (this.boardState.currentPlayer === 1) {
                switch (this.boardState.gamePhase) {
                    case 'roll_dice':
                        turnIndicator.textContent = 'Es tu turno - Lanza el dado';
                        break;
                    case 'place_dinosaur':
                        turnIndicator.textContent = 'Es tu turno - Arrastra un dinosaurio';
                        break;
                    case 'wait_turn':
                        turnIndicator.textContent = 'Esperando que finalices el turno';
                        break;
                }
            } else {
                turnIndicator.textContent = 'Turno del rival - Espera tu turno';
            }
        }

        // Actualizar event listeners de drag and drop
        this.updateDragEventListeners();
        
        // Actualizar restricciones visuales
        this.updateEnclosureRestrictions();
    }

    calculateCurrentScores() {
        if (!this.boardState) return { player1: 0, player2: 0 };
        
        let player1Score = 0;
        let player2Score = 0;
        
        Object.values(this.boardState.player1Board).forEach(enclosureDinos => {
            player1Score += enclosureDinos.length;
        });
        
        Object.values(this.boardState.player2Board).forEach(enclosureDinos => {
            player2Score += enclosureDinos.length;
        });
        
        return {
            player1: player1Score,
            player2: player2Score
        };
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
            ...options
        };

        if (config.body && config.method !== 'GET') {
            config.body = JSON.stringify(config.body);
        }

        const response = await fetch(url, config);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
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

// ==================== PWA FEATURES ==================== 
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered'))
            .catch(error => console.log('SW registration failed'));
    });
}