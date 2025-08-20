
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
        this.pollingInterval = null;
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
            'btn-limpiar-partidas': () => this.limpiarPartidas(),
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

    // ==================== SISTEMA DE TABLERO MEJORADO ==================== 
    
    // FUNCIÓN EMPEZAR TURNO MEJORADA
    empezarTurno() {
        // Verificar si necesito lanzar el dado primero
        if (this.shouldRollDice() && !this.gameState?.current_restriction) {
            this.startDiceRoll();
            return;
        }
        
        // Ir al tablero
        this.showScreen('tablero');
        
        // Inicializar funcionalidad del tablero
        setTimeout(() => {
            this.initializeTablero();
            this.initializeDragDrop();
            this.updateContinueButton();
        }, 100);
    }

    // INICIALIZACIÓN COMPLETA DEL TABLERO
    initializeTablero() {
        this.setupTableroEventListeners();
        this.setupKeyboardNavigation();
        this.setupTouchSupport();
        this.updateGameUI();
    }

    setupTableroEventListeners() {
        // Limpiar listeners previos para evitar duplicados
        this.cleanupTableroListeners();
        
        // Configurar controles del juego
        const btnContinuar = document.getElementById('btn-continuar-turno');
        if (btnContinuar) {
            btnContinuar.addEventListener('click', this.continuarTurno.bind(this));
        }
    }

    cleanupTableroListeners() {
        // Remover listeners previos
        const btnContinuar = document.getElementById('btn-continuar-turno');
        if (btnContinuar) {
            btnContinuar.removeEventListener('click', this.continuarTurno.bind(this));
        }
    }

    // DRAG & DROP MEJORADO
    initializeDragDrop() {
        // Limpiar listeners previos
        this.cleanupDragDrop();

        // Configurar dinosaurios arrastrables
        const dinosaurios = document.querySelectorAll('.menu_partida .dinosaurio');
        const recintos = document.querySelectorAll('.recinto:not(.bloqueado)');

        dinosaurios.forEach(dino => {
            dino.addEventListener('dragstart', this.handleDragStart.bind(this));
            dino.addEventListener('dragend', this.handleDragEnd.bind(this));
            
            // Soporte para dispositivos táctiles
            dino.addEventListener('click', this.handleDinosaurClick.bind(this));
            
            // Soporte para teclado
            dino.addEventListener('keydown', this.handleDinosaurKeydown.bind(this));
        });

        recintos.forEach(recinto => {
            recinto.addEventListener('dragover', this.handleDragOver.bind(this));
            recinto.addEventListener('drop', this.handleDrop.bind(this));
            recinto.addEventListener('dragleave', this.handleDragLeave.bind(this));
            recinto.addEventListener('click', this.handleRecintoClick.bind(this));
            recinto.addEventListener('keydown', this.handleRecintoKeydown.bind(this));
        });
    }

    // EVENTOS DE DRAG & DROP
    handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.id);
        e.target.classList.add('dragging');
        this.highlightValidDropZones(e.target);
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        this.clearHighlights();
    }

    handleDragOver(e) {
        e.preventDefault();
        if (!e.target.classList.contains('bloqueado')) {
            e.target.classList.add('drag-over');
        }
    }

    handleDragLeave(e) {
        e.target.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        e.target.classList.remove('drag-over');
        
        if (e.target.classList.contains('bloqueado')) {
            this.showToast('No puedes colocar en una zona bloqueada', 'error');
            this.addErrorFeedback(e.target);
            return;
        }
        
        const dinoId = e.dataTransfer.getData('text/plain');
        const dinosaurio = document.getElementById(dinoId);
        
        if (dinosaurio && this.validateTableroPlacement(dinosaurio, e.target)) {
            this.placeDinosaur(dinosaurio, e.target);
        }
        
        this.clearHighlights();
    }

    // SOPORTE MÓVIL Y TECLADO
    handleDinosaurClick(e) {
        // Limpiar selecciones previas
        document.querySelectorAll('.dinosaurio.selected').forEach(dino => {
            dino.classList.remove('selected');
        });
        
        // Seleccionar este dinosaurio
        e.target.classList.add('selected');
        this.highlightValidDropZones(e.target);
        this.showToast('Dinosaurio seleccionado. Haz clic en un recinto para colocarlo.', 'info');
    }

    handleDinosaurKeydown(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.handleDinosaurClick(e);
        }
    }

    handleRecintoClick(e) {
        const selectedDino = document.querySelector('.dinosaurio.selected');
        if (!selectedDino) return;
        
        if (e.target.classList.contains('bloqueado')) {
            this.showToast('No puedes colocar en una zona bloqueada', 'error');
            this.addErrorFeedback(e.target);
            return;
        }
        
        if (this.validateTableroPlacement(selectedDino, e.target)) {
            this.placeDinosaur(selectedDino, e.target);
            selectedDino.classList.remove('selected');
            this.clearHighlights();
        }
    }

    handleRecintoKeydown(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.handleRecintoClick(e);
        }
    }

    setupKeyboardNavigation() {
        // Agregar listener global para navegación por teclado
        document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
    }

    handleGlobalKeydown(e) {
        // Solo actuar si estamos en la pantalla del tablero
        if (this.currentScreen !== 'tablero') return;
        
        if (e.key === 'Escape') {
            this.clearAllTableroSelections();
        }
    }

    // VALIDACIÓN ESPECÍFICA DEL TABLERO
    validateTableroPlacement(dinosaurio, recinto) {
        // Verificar que no esté bloqueado
        if (recinto.classList.contains('bloqueado')) {
            this.showToast('Esta zona está bloqueada por el dado', 'error');
            return false;
        }
        
        // Verificar capacidad del recinto
        const capacity = this.getRecintoCapacity(recinto);
        const currentDinos = recinto.querySelectorAll('.dinosaurio').length;
        
        if (currentDinos >= capacity) {
            this.showToast('Este recinto está lleno', 'error');
            return false;
        }
        
        // Validar reglas específicas del recinto
        return this.validateRecintoRules(dinosaurio, recinto);
    }

    getRecintoCapacity(recinto) {
        const enclosureId = recinto.dataset.enclosureId;
        const capacities = {
            '1': 4,   // Bosque de Iguales 1
            '2': 6,   // Bosque de Iguales 2  
            '3': 3,   // Trío del Bosque
            '4': 4,   // Pradera Diferentes 1
            '5': 5,   // Pradera Diferentes 2
            '6': 6,   // Pradera del Amor
            '7': 1,   // Rey de la Selva
            '8': 1,   // Isla Solitaria
            '9': 999  // Río
        };
        
        return capacities[enclosureId] || 1;
    }

    validateRecintoRules(dinosaurio, recinto) {
        const enclosureType = recinto.dataset.type;
        const dinoTypeId = dinosaurio.dataset.dinosaurTypeId;
        const existingDinos = Array.from(recinto.querySelectorAll('.dinosaurio'));
        
        switch (enclosureType) {
            case 'bosque_iguales':
                return this.validateSameSpeciesOnly(dinoTypeId, existingDinos, 'Bosque de Iguales: solo una especie');
                
            case 'pradera_diferentes':
                return this.validateDifferentSpeciesOnly(dinoTypeId, existingDinos, 'Pradera de Diferencias: todas especies diferentes');
                
            case 'trio_bosque':
                if (existingDinos.length >= 3) {
                    this.showToast('El Trío del Bosque ya está completo (máximo 3)', 'error');
                    return false;
                }
                return true;
                
            case 'rey_selva':
            case 'isla_solitaria':
                if (existingDinos.length >= 1) {
                    this.showToast('Este recinto solo permite un dinosaurio', 'error');
                    return false;
                }
                return true;
                
            case 'pradera_amor':
            case 'rio':
                return true; // Sin restricciones especiales
                
            default:
                return true;
        }
    }

    validateSameSpeciesOnly(dinoTypeId, existingDinos, errorMessage) {
        if (existingDinos.length === 0) return true;
        
        const existingTypes = existingDinos.map(dino => dino.dataset.dinosaurTypeId);
        const firstType = existingTypes[0];
        
        if (firstType !== dinoTypeId) {
            this.showToast(errorMessage, 'error');
            return false;
        }
        
        return true;
    }

    validateDifferentSpeciesOnly(dinoTypeId, existingDinos, errorMessage) {
        const existingTypes = existingDinos.map(dino => dino.dataset.dinosaurTypeId);
        
        if (existingTypes.includes(dinoTypeId)) {
            this.showToast(errorMessage, 'error');
            return false;
        }
        
        return true;
    }

    // COLOCACIÓN MEJORADA
    async placeDinosaur(dinosaurio, recinto) {
        const dinosaurTypeId = parseInt(dinosaurio.dataset.dinosaurTypeId);
        const handPosition = parseInt(dinosaurio.dataset.handPosition);
        const enclosureId = parseInt(recinto.dataset.enclosureId);

        if (!this.gameSession?.id) {
            this.showToast('Error: No hay sesión de juego activa', 'error');
            return;
        }

        try {
            // Mostrar loading
            this.setLoading(true);
            
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
                this.moveDinosaurVisually(dinosaurio, recinto);
                
                // Feedback visual de éxito
                this.addSuccessFeedback(recinto);
                
                // Habilitar botón continuar
                this.updateContinueButton();

                this.showToast('¡Dinosaurio colocado correctamente!', 'success');
                
                // Disparar evento personalizado
                this.dispatchDinosaurPlaced(dinosaurio, recinto);
                
                // Si el juego terminó, mostrar resultados
                if (response.game_state === 'finished') {
                    this.handleGameEnd(response);
                }
            } else {
                this.showToast(response.message || 'Error al colocar dinosaurio', 'error');
            }
        } catch (error) {
            console.error('Placement error:', error);
            this.showToast('Error de conexión', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    moveDinosaurVisually(dinosaurio, recinto) {
        // Cambiar imagen si es necesario
        const boardSrc = dinosaurio.dataset.boardSrc;
        if (boardSrc) dinosaurio.src = boardSrc;
        
        // Actualizar estilos para el tablero
        dinosaurio.className = 'dinosaurio';
        dinosaurio.draggable = false;
        dinosaurio.style.width = '30px';
        dinosaurio.style.height = '30px';
        dinosaurio.style.pointerEvents = 'none';
        dinosaurio.removeAttribute('tabindex');
        
        // Agregar animación de colocación
        dinosaurio.classList.add('placing');
        
        // Remover datos de drag & drop
        delete dinosaurio.dataset.dinosaurTypeId;
        delete dinosaurio.dataset.handPosition;
        delete dinosaurio.dataset.menuSrc;
        delete dinosaurio.dataset.boardSrc;
        
        // Mover al recinto con animación
        recinto.appendChild(dinosaurio);
        
        // Limpiar animación después de un tiempo
        setTimeout(() => {
            dinosaurio.classList.remove('placing');
        }, 600);
    }

    // UTILIDADES VISUALES DEL TABLERO
    highlightValidDropZones(dinosaurio) {
        const recintos = document.querySelectorAll('.recinto');
        
        recintos.forEach(recinto => {
            if (this.validateTableroPlacement(dinosaurio, recinto)) {
                recinto.classList.add('highlight');
            }
        });
    }

    clearHighlights() {
        document.querySelectorAll('.recinto').forEach(recinto => {
            recinto.classList.remove('highlight', 'drag-over');
        });
    }

    clearAllTableroSelections() {
        document.querySelectorAll('.dinosaurio.selected').forEach(dino => {
            dino.classList.remove('selected');
        });
        this.clearHighlights();
    }

    addSuccessFeedback(element) {
        element.classList.add('success-feedback');
        setTimeout(() => {
            element.classList.remove('success-feedback');
        }, 600);
    }

    addErrorFeedback(element) {
        element.classList.add('error-feedback');
        setTimeout(() => {
            element.classList.remove('error-feedback');
        }, 600);
    }

    // GESTIÓN DE TURNOS ACTUALIZADA
    updateContinueButton() {
        const btnContinuar = document.getElementById('btn-continuar-turno');
        if (!btnContinuar) return;
        
        const remainingDinos = document.querySelectorAll('.menu_partida .dinosaurio').length;
        const placedDinos = document.querySelectorAll('.recinto .dinosaurio').length;
        
        // Habilitar solo si se ha colocado al menos un dinosaurio en este turno
        const hasPlacedInThisTurn = placedDinos > 0;
        btnContinuar.disabled = !hasPlacedInThisTurn;
        
        // Actualizar texto del botón
        const buttonText = btnContinuar.querySelector('span');
        if (buttonText) {
            if (remainingDinos <= 1) {
                buttonText.textContent = 'Finalizar turno';
            } else {
                buttonText.textContent = 'Continuar';
            }
        }
    }

    // SOPORTE PARA DISPOSITIVOS TÁCTILES
    setupTouchSupport() {
        let touchDino = null;
        let touchStartPos = { x: 0, y: 0 };
        
        document.querySelectorAll('.menu_partida .dinosaurio').forEach(dino => {
            dino.addEventListener('touchstart', (e) => this.handleTouchStart(e, touchDino, touchStartPos), { passive: false });
            dino.addEventListener('touchmove', (e) => this.handleTouchMove(e, touchDino, touchStartPos), { passive: false });
            dino.addEventListener('touchend', (e) => this.handleTouchEnd(e, touchDino, touchStartPos), { passive: false });
        });
    }

    handleTouchStart(e, touchDino, touchStartPos) {
        e.preventDefault();
        touchDino = e.target;
        const touch = e.touches[0];
        touchStartPos = { x: touch.clientX, y: touch.clientY };
        
        // Seleccionar dinosaurio
        this.handleDinosaurClick({ target: touchDino });
    }

    handleTouchMove(e, touchDino, touchStartPos) {
        e.preventDefault();
        if (!touchDino) return;
        
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - touchStartPos.x);
        const deltaY = Math.abs(touch.clientY - touchStartPos.y);
        
        // Si se movió suficiente, mostrar feedback de arrastre
        if (deltaX > 10 || deltaY > 10) {
            touchDino.style.transform = `translate(${touch.clientX - touchStartPos.x}px, ${touch.clientY - touchStartPos.y}px) scale(1.1)`;
        }
    }

    handleTouchEnd(e, touchDino, touchStartPos) {
        e.preventDefault();
        if (!touchDino) return;
        
        const touch = e.changedTouches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const recinto = element?.closest('.recinto');
        
        // Resetear posición
        touchDino.style.transform = '';
        
        if (recinto && this.validateTableroPlacement(touchDino, recinto)) {
            this.placeDinosaur(touchDino, recinto);
            touchDino.classList.remove('selected');
            this.clearHighlights();
        }
        
        touchDino = null;
    }

    // EVENTOS PERSONALIZADOS
    dispatchDinosaurPlaced(dinosaurio, recinto) {
        const event = new CustomEvent('dinosaurPlaced', {
            detail: {
                dinosaurio: dinosaurio,
                recinto: recinto,
                dinoType: dinosaurio.dataset.dinosaurTypeId,
                enclosureId: recinto.dataset.enclosureId
            }
        });
        
        document.dispatchEvent(event);
    }

    // ==================== TABLERO Y TURNOS ORIGINALES MEJORADOS ==================== 
    loadGameState(gameState) {
        this.gameState = gameState;
        this.updateGameUI();
    }

    updateGameUI() {
        if (!this.gameState) return;

        // Actualizar información básica del juego
        this.updatePlayersInfo();
        this.updateGameInfo();
        
        // Cargar dinosaurios en mano del jugador actual
        this.loadPlayerHand();
        
        // Cargar estado del tablero
        this.loadBoardState();
        
        // Aplicar restricciones del dado
        this.applyDiceRestrictions();
    }

    updatePlayersInfo() {
        const player1Data = this.gameState.players?.player1 || this.gameState.player1;
        const player2Data = this.gameState.players?.player2 || this.gameState.player2;
        
        // Actualizar nombres de jugadores
        const player1Name = document.getElementById('player1-name');
        const player2Name = document.getElementById('player2-name');
        if (player1Name && player1Data) player1Name.textContent = player1Data.name;
        if (player2Name && player2Data) player2Name.textContent = player2Data.name;

        // Actualizar puntuaciones
        const player1Points = document.getElementById('player1-points');
        const player2Points = document.getElementById('player2-points');
        if (player1Points && player1Data) player1Points.textContent = `${player1Data.score || 0} ptos`;
        if (player2Points && player2Data) player2Points.textContent = `${player2Data.score || 0} ptos`;
    }

    updateGameInfo() {
        // Actualizar información de ronda
        const rondaActual = document.getElementById('ronda-actual');
        if (rondaActual) rondaActual.textContent = `Ronda ${this.gameState.current_round || 1}`;

        // Actualizar información del dado
        const restriction = this.gameState.current_restriction;
        if (restriction) {
            const dadoActual = document.getElementById('dado-actual');
            const dadoDescripcion = document.getElementById('dado-descripcion');
            if (dadoActual) dadoActual.src = restriction.image || 'img/dado-1.png';
            if (dadoDescripcion) dadoDescripcion.textContent = restriction.title || 'Sin restricción';
        }
    }

    loadPlayerHand() {
        const dinosauriosContainer = document.querySelector('.dinosaurios');
        if (!dinosauriosContainer || !this.gameState) return;

        // Determinar qué jugador es el usuario actual
        const userPlayerNumber = this.gameState.user_player_number || 1;
        const playerData = this.gameState.players?.[`player${userPlayerNumber}`] || this.gameState[`player${userPlayerNumber}`];
        
        // Limpiar contenedor
        dinosauriosContainer.innerHTML = '<h3 class="titulos-accesibles">Dinosaurios para colocar</h3>';

        if (!playerData?.hand || !Array.isArray(playerData.hand)) {
            const mensaje = document.createElement('p');
            mensaje.textContent = 'No hay dinosaurios disponibles';
            mensaje.style.color = 'white';
            mensaje.style.textAlign = 'center';
            dinosauriosContainer.appendChild(mensaje);
            return;
        }

        // Crear elementos de dinosaurios disponibles
        playerData.hand.forEach((dinosaur, index) => {
            if (dinosaur && !dinosaur.is_played) {
                const dinoImg = this.createDinosaurElement(dinosaur, index);
                dinosauriosContainer.appendChild(dinoImg);
            }
        });
    }

    createDinosaurElement(dinosaur, index) {
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
        
        // Datos necesarios para la colocación
        dinoImg.dataset.dinosaurTypeId = dinosaur.type_id;
        dinoImg.dataset.handPosition = dinosaur.position;
        dinoImg.dataset.menuSrc = dinosaur.icon || 'img/dino-default.png';
        dinoImg.dataset.boardSrc = dinosaur.icon || 'img/dino-default.png';

        return dinoImg;
    }

    loadBoardState() {
        if (!this.gameState) return;

        // Limpiar todos los recintos
        document.querySelectorAll('.recinto').forEach(recinto => {
            const dinosaurios = recinto.querySelectorAll('.dinosaurio');
            dinosaurios.forEach(dino => dino.remove());
        });

        // Determinar qué jugador es el usuario actual
        const userPlayerNumber = this.gameState.user_player_number || 1;
        const playerData = this.gameState.players?.[`player${userPlayerNumber}`] || this.gameState[`player${userPlayerNumber}`];
        
        if (!playerData?.board || !Array.isArray(playerData.board)) {
            return;
        }

        // Colocar dinosaurios en el tablero
        playerData.board.forEach(placement => {
            this.placeDinosaurOnBoard(placement);
        });
    }

    placeDinosaurOnBoard(placement) {
        const recinto = document.querySelector(`[data-enclosure-id="${placement.enclosure_id}"]`);
        if (!recinto || !placement.dinosaur) return;

        const dinoImg = document.createElement('img');
        dinoImg.src = placement.dinosaur.icon || 'img/dino-default.png';
        dinoImg.className = 'dinosaurio';
        dinoImg.alt = placement.dinosaur.name || 'Dinosaurio';
        dinoImg.width = 30;
        dinoImg.height = 30;
        dinoImg.style.pointerEvents = 'none'; // No interactúa una vez colocado
        
        recinto.appendChild(dinoImg);
    }

    // APLICAR RESTRICCIONES DEL DADO
    applyDiceRestrictions() {
        // Limpiar restricciones previas
        document.querySelectorAll('.recinto').forEach(recinto => {
            recinto.classList.remove('bloqueado');
        });

        // Solo aplicar restricciones si afectan al usuario actual
        const userPlayerNumber = this.gameState?.user_player_number || 1;
        const restriction = this.gameState?.current_restriction;
        const restrictedPlayer = this.gameState?.restricted_player;
        
        if (!restriction || restrictedPlayer !== userPlayerNumber) {
            return;
        }

        this.applySpecificTableroRestriction(restriction);
    }

    applySpecificTableroRestriction(restriction) {
        switch (restriction.restriction_type) {
            case 'zone':
                this.blockZonesExceptTablero(restriction.restriction_value);
                break;
                
            case 'empty':
                this.blockNonEmptyEnclosuresTablero();
                break;
                
            case 'no_trex':
                this.blockEnclosuresWithTrexTablero();
                break;
        }
    }

    blockZonesExceptTablero(allowedZone) {
        document.querySelectorAll('.recinto').forEach(recinto => {
            const zone = recinto.dataset.zone;
            if (zone !== allowedZone && zone !== 'rio') {
                recinto.classList.add('bloqueado');
            }
        });
    }

    blockNonEmptyEnclosuresTablero() {
        document.querySelectorAll('.recinto').forEach(recinto => {
            const hasDinosaurs = recinto.querySelectorAll('.dinosaurio').length > 0;
            if (hasDinosaurs && recinto.dataset.zone !== 'rio') {
                recinto.classList.add('bloqueado');
            }
        });
    }

    blockEnclosuresWithTrexTablero() {
        document.querySelectorAll('.recinto').forEach(recinto => {
            const hasTrex = Array.from(recinto.querySelectorAll('.dinosaurio')).some(dino => 
                dino.alt && dino.alt.toLowerCase().includes('t-rex')
            );
            if (hasTrex && recinto.dataset.zone !== 'rio') {
                recinto.classList.add('bloqueado');
            }
        });
    }

    showIndicadorTurno() {
        if (!this.gameState) return;
        
        const currentPlayer = this.gameState.current_player;
        const userPlayerNumber = this.gameState.user_player_number || 1;
        const isMyTurn = currentPlayer === userPlayerNumber;
        
        const turnoTitulo = document.getElementById('turno-titulo');
        const turnoDescripcion = document.getElementById('turno-descripcion');
        const turnoAvatar = document.getElementById('turno-avatar');

        if (isMyTurn) {
            if (turnoTitulo) turnoTitulo.textContent = 'Tu turno';
            
            if (this.gameState.current_restriction) {
                if (turnoDescripcion) turnoDescripcion.textContent = 'Es tu turno para colocar un dinosaurio';
            } else {
                if (turnoDescripcion) turnoDescripcion.textContent = 'Primero debes lanzar el dado';
            }
            
            if (turnoAvatar) turnoAvatar.src = 'img/foto_usuario-1.png';
        } else {
            const otherPlayerData = this.gameState.players?.[`player${currentPlayer}`] || 
                                  this.gameState[`player${currentPlayer}`];
            const otherPlayerName = otherPlayerData?.name || `Jugador ${currentPlayer}`;
            
            if (turnoTitulo) turnoTitulo.textContent = `Sigue ${otherPlayerName}`;
            if (turnoDescripcion) turnoDescripcion.textContent = 'Esperando al otro jugador...';
            if (turnoAvatar) turnoAvatar.src = 'img/foto_usuario-2.png';
            
            // Iniciar polling si no es mi turno
            this.startGameStatePolling();
        }

        this.showScreen('turno');
    }

    // ==================== GESTIÓN DE TURNOS MEJORADA ==================== 
    async continuarTurno() {
        if (!this.gameSession?.id) {
            this.showToast('Error: No hay sesión de juego activa', 'error');
            return;
        }

        try {
            this.setLoading(true);
            
            // Verificar si quedan dinosaurios en la mano
            const remainingDinos = document.querySelectorAll('.menu_partida .dinosaurio').length;
            
            if (remainingDinos > 0) {
                // Continuar con el siguiente jugador
                await this.proceedToNextPlayer();
            } else {
                // Fin de ronda o juego
                await this.handleEndOfRound();
            }
            
        } catch (error) {
            console.error('Turn continuation error:', error);
            this.showToast('Error al continuar turno', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async proceedToNextPlayer() {
        // Verificar el estado actual del juego
        const response = await this.apiRequest(`/api/game/state.php?game_id=${this.gameSession.id}`);
        
        if (response.success) {
            this.gameState = response.game_state;
            
            // Determinar si necesitamos lanzar el dado
            if (this.shouldRollDice()) {
                await this.startDiceRoll();
            } else {
                // Pasar al siguiente jugador directamente
                this.showIndicadorTurno();
            }
        }
    }

    shouldRollDice() {
        // El jugador que acaba de colocar debe lanzar el dado para el siguiente
        // excepto en el primer turno de cada ronda
        const currentPlayer = this.gameState.current_player;
        const userPlayerNumber = this.gameState.user_player_number;
        
        // Si soy el jugador actual, debo lanzar el dado para el siguiente
        return currentPlayer === userPlayerNumber;
    }

    async startDiceRoll() {
        // Mostrar animación del dado
        this.showScreen('dado-animacion');
        
        setTimeout(async () => {
            await this.animarDado();
        }, 500);
    }

    async handleEndOfRound() {
        // Verificar si ambos jugadores terminaron sus dinosaurios
        const response = await this.apiRequest(`/api/game/state.php?game_id=${this.gameSession.id}`);
        
        if (response.success) {
            const gameState = response.game_state;
            
            if (gameState.game_state === 'finished') {
                this.handleGameEnd(gameState);
            } else if (gameState.current_round > this.gameState.current_round) {
                // Nueva ronda
                this.handleNewRound(gameState);
            } else {
                // Esperar al otro jugador
                this.showWaitingForPlayer();
            }
        }
    }

    handleNewRound(gameState) {
        this.gameState = gameState;
        this.showToast(`¡Ronda ${gameState.current_round} iniciada!`, 'info');
        
        // Comenzar con el lanzamiento del dado
        setTimeout(() => {
            this.startDiceRoll();
        }, 1500);
    }

    showWaitingForPlayer() {
        this.showToast('Esperando a que el otro jugador termine sus dinosaurios...', 'info');
        
        // Ocultar botón de continuar
        const btnContinuar = document.getElementById('btn-continuar-turno');
        if (btnContinuar) btnContinuar.disabled = true;
        
        // Polling cada 3 segundos para verificar el estado
        this.startGameStatePolling();
    }

    startGameStatePolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        
        this.pollingInterval = setInterval(async () => {
            try {
                const response = await this.apiRequest(`/api/game/state.php?game_id=${this.gameSession.id}`);
                
                if (response.success) {
                    const newGameState = response.game_state;
                    
                    // Verificar si hay cambios significativos
                    if (this.hasSignificantStateChange(newGameState)) {
                        clearInterval(this.pollingInterval);
                        this.handleStateChange(newGameState);
                    }
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 3000);
    }

    hasSignificantStateChange(newGameState) {
        if (!this.gameState) return true;
        
        return (
            newGameState.current_round !== this.gameState.current_round ||
            newGameState.current_player !== this.gameState.current_player ||
            newGameState.game_state !== this.gameState.game_state ||
            newGameState.dice_restriction !== this.gameState.dice_restriction
        );
    }

    handleStateChange(newGameState) {
        this.gameState = newGameState;
        
        if (newGameState.game_state === 'finished') {
            this.handleGameEnd(newGameState);
        } else if (newGameState.current_round > this.gameState.current_round) {
            this.handleNewRound(newGameState);
        } else {
            // Actualizar UI y continuar
            this.updateGameUI();
            this.showIndicadorTurno();
        }
    }

    handleGameEnd(gameState) {
        clearInterval(this.pollingInterval);
        
        const finalScores = {
            player1_score: gameState.players?.player1?.score || gameState.player1_score || 0,
            player2_score: gameState.players?.player2?.score || gameState.player2_score || 0
        };
        
        const player1Name = gameState.players?.player1?.name || 'Jugador 1';
        const player2Name = gameState.players?.player2?.name || 'Jugador 2';
        
        // Determinar ganador
        let winnerMessage = '';
        if (finalScores.player1_score > finalScores.player2_score) {
            winnerMessage = `¡${player1Name} gana!`;
        } else if (finalScores.player2_score > finalScores.player1_score) {
            winnerMessage = `¡${player2Name} gana!`;
        } else {
            winnerMessage = '¡Empate!';
        }
        
        // Mostrar resultados finales
        this.showGameResults(finalScores, winnerMessage, player1Name, player2Name);
    }

    showGameResults(scores, winnerMessage, player1Name, player2Name) {
        // Actualizar pantalla de resultados o crear popup
        const resultMessage = `🏆 JUEGO TERMINADO 🏆\n\n` +
                             `${player1Name}: ${scores.player1_score} puntos\n` +
                             `${player2Name}: ${scores.player2_score} puntos\n\n` +
                             `${winnerMessage}`;
        
        this.showToast(resultMessage, 'success');
        
        // Opcional: Mostrar pantalla de resultados detallados
        setTimeout(() => {
            this.showDetailedResults(scores, winnerMessage, player1Name, player2Name);
        }, 3000);
    }

    showDetailedResults(scores, winnerMessage, player1Name, player2Name) {
        // Crear popup o ir a pantalla de resultados
        // Por ahora, regresar al lobby
        setTimeout(() => {
            this.showScreen('lobby');
            this.showToast('Gracias por jugar Draftosaurus', 'info');
        }, 2000);
    }

    // ==================== CLEANUP MEJORADO ====================
    cleanupDragDrop() {
        // Limpiar clases visuales
        document.querySelectorAll('.dinosaurio').forEach(dino => {
            dino.classList.remove('dragging', 'selected');
        });
        
        this.clearHighlights();
        
        // Remover listeners específicos del tablero si es necesario
        this.cleanupTableroListeners();
    }

    cleanup() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    // Agregar al destructor o cuando se cambie de pantalla
    beforeUnload() {
        this.cleanup();
    }

    // ==================== DEBUGGING PARA DESARROLLO ====================
    debugTableroState() {
        if (!window.DEBUG) return;
        
        console.log('=== DEBUG TABLERO STATE ===');
        console.log('Current screen:', this.currentScreen);
        console.log('Game state:', this.gameState);
        console.log('Dinosaurios disponibles:', document.querySelectorAll('.menu_partida .dinosaurio').length);
        console.log('Dinosaurios colocados:', document.querySelectorAll('.recinto .dinosaurio').length);
        
        document.querySelectorAll('.recinto').forEach(recinto => {
            const dinos = recinto.querySelectorAll('.dinosaurio').length;
            if (dinos > 0) {
                console.log(`${recinto.id}: ${dinos} dinosaurios`);
            }
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