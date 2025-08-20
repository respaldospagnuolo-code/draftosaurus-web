// ==================== SISTEMA DE MANEJO DE ESTADOS - ACTUALIZADO ==================== 
class AppState {
    constructor() {
        this.currentScreen = 'carga';
        this.user = null;
        this.loading = false;
        this.gameSession = null;
        this.dadoSeleccionado = null;
        this.draggedCard = null;
        this.boardState = null;
        this.currentPlayer = 1; // 1 o 2
        this.currentRound = 1;
        this.currentTurn = 1;
        this.diceRestriction = null;
        this.restrictedPlayer = null;
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
            'end-turn-btn': () => this.finalizarTurno(),
            'view-map-btn': () => this.mostrarMapaOponente(),
            'map-popup': (e) => {
                if (e.target === e.currentTarget) this.cerrarMapaOponente();
            },
            'btn-siguiente-ronda': () => this.iniciarSiguienteRonda(),
            'btn-nueva-partida': () => this.nuevaPartida(),
            'btn-volver-lobby': () => this.showScreen('lobby')
        };

        if (actions[target.id]) {
            actions[target.id](e);
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
            // Generar resultado del dado (1-6)
            const dadoFinal = Math.floor(Math.random() * 6) + 1;
            this.dadoSeleccionado = dadoFinal;

            // Configuración de restricciones del dado
            const restricciones = {
                1: { titulo: 'ADYACENTE A BAÑOS', descripcion: 'Coloca el dinosaurio en un recinto adyacente a un baño (masculino o femenino).', imagen: 'img/dado-1.png' },
                2: { titulo: 'RECINTO OCUPADO', descripcion: 'Coloca el dinosaurio en un recinto que tenga al menos otro dinosaurio dentro.', imagen: 'img/dado-2.png' },
                3: { titulo: 'SIN T-REX', descripcion: 'Coloca el dinosaurio en un recinto donde no haya un T-Rex.', imagen: 'img/dado-3.png' },
                4: { titulo: 'ADYACENTE A CAFETERÍA', descripcion: 'Coloca el dinosaurio en un recinto adyacente a la cafetería.', imagen: 'img/dado-4.png' },
                5: { titulo: 'ZONA BOSCOSA', descripcion: 'Coloca el dinosaurio en un recinto de la zona boscosa del tablero.', imagen: 'img/dado-5.png' },
                6: { titulo: 'ZONA ROCOSA', descripcion: 'Coloca el dinosaurio en un recinto de la zona rocosa del tablero.', imagen: 'img/dado-6.png' }
            };

            const config = restricciones[dadoFinal];

            // Mostrar resultado visual
            dadoImg.src = dados[dadoFinal - 1];
            dadoContainer.classList.remove('spinning');
            dadoContainer.classList.add('final');

            if (dadoTexto) {
                dadoTexto.textContent = '¡Dado lanzado!';
            }

            // Establecer restricción para el siguiente jugador
            this.diceRestriction = dadoFinal;
            this.restrictedPlayer = this.currentPlayer === 1 ? 2 : 1;

            setTimeout(() => {
                this.mostrarResultadoDado(dadoFinal, config);
            }, 800);
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
            // Inicializar estado del juego
            this.boardState = {
                currentPlayer: 1,
                currentRound: 1,
                currentTurn: 1,
                diceRestriction: this.diceRestriction,
                restrictedPlayer: this.restrictedPlayer,
                player1Hand: [],
                player2Hand: [],
                player1Board: {},
                player2Board: {},
                player1Score: 0,
                player2Score: 0
            };

            this.generateInitialHands();
            this.showScreen('partida');
            this.updateGameUI();
            this.showToast('¡Partida iniciada!', 'success');
        } catch (error) {
            this.showToast('Error al iniciar el juego', 'error');
        }
    }

    // ==================== GENERACIÓN DE MANOS ==================== 
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

        this.renderCurrentPlayerHand();
    }

    renderCurrentPlayerHand() {
        const handContainer = document.getElementById('current-player-hand');
        if (!handContainer) return;

        const currentHand = this.currentPlayer === 1 ? this.boardState.player1Hand : this.boardState.player2Hand;
        
        handContainer.innerHTML = '';
        
        currentHand.forEach(dino => {
            if (!dino.isPlayed) {
                const card = document.createElement('div');
                card.className = `dinosaur-card ${dino.class}`;
                card.draggable = true;
                card.dataset.type = dino.id;
                card.dataset.position = dino.position;
                
                const img = document.createElement('img');
                img.src = dino.icon;
                img.alt = dino.name;
                card.appendChild(img);
                
                // Event listeners para drag and drop
                card.addEventListener('dragstart', this.handleDragStart.bind(this));
                card.addEventListener('dragend', this.handleDragEnd.bind(this));
                
                handContainer.appendChild(card);
            }
        });

        this.setupDropZones();
    }

    setupDropZones() {
        document.querySelectorAll('.enclosure').forEach(enclosure => {
            enclosure.addEventListener('dragover', this.handleDragOver.bind(this));
            enclosure.addEventListener('dragenter', this.handleDragEnter.bind(this));
            enclosure.addEventListener('dragleave', this.handleDragLeave.bind(this));
            enclosure.addEventListener('drop', this.handleDrop.bind(this));
        });
    }

    // ==================== DRAG AND DROP ==================== 
    handleDragStart(e) {
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

    // ==================== VALIDACIÓN DE COLOCACIÓN ==================== 
    canPlaceInEnclosure(enclosure) {
        const enclosureId = enclosure.dataset.id;
        const capacity = enclosure.querySelector('.capacity-indicator').textContent;
        const currentCount = enclosure.querySelectorAll('.placed-dinosaur').length;
        const dinoType = parseInt(this.draggedCard.dataset.type);

        // Verificar capacidad
        if (capacity !== '∞' && currentCount >= parseInt(capacity)) {
            return false;
        }

        // Verificar restricciones del dado
        if (this.restrictedPlayer === this.currentPlayer && this.diceRestriction) {
            if (!this.validateDiceRestriction(enclosureId, dinoType)) {
                return false;
            }
        }

        // Validaciones específicas por tipo de recinto
        return this.validateEnclosureRules(enclosure, dinoType);
    }

    validateDiceRestriction(enclosureId, dinoType) {
        switch (this.diceRestriction) {
            case 1: // Adyacente a baños
                return this.isAdjacentToBathroom(enclosureId);
            case 2: // Recinto ocupado
                return this.hasOccupiedEnclosure(enclosureId);
            case 3: // Sin T-Rex
                return !this.hasTRexInEnclosure(enclosureId);
            case 4: // Adyacente a cafetería
                return this.isAdjacentToCafeteria(enclosureId);
            case 5: // Zona boscosa
                return this.isForestZone(enclosureId);
            case 6: // Zona rocosa
                return this.isRockyZone(enclosureId);
            default:
                return true;
        }
    }

    isAdjacentToBathroom(enclosureId) {
        const adjacentToBathroom = ['pradera-amor', 'cine-comida', 'rio'];
        return adjacentToBathroom.includes(enclosureId);
    }

    hasOccupiedEnclosure(enclosureId) {
        const enclosure = document.querySelector(`[data-id="${enclosureId}"]`);
        return enclosure.querySelectorAll('.placed-dinosaur').length > 0;
    }

    hasTRexInEnclosure(enclosureId) {
        const enclosure = document.querySelector(`[data-id="${enclosureId}"]`);
        const dinosaurs = enclosure.querySelectorAll('.placed-dinosaur img');
        return Array.from(dinosaurs).some(img => img.src.includes('dino-trex'));
    }

    isAdjacentToCafeteria(enclosureId) {
        const adjacentToCafeteria = ['rey-selva', 'trio-bosque', 'rio'];
        return adjacentToCafeteria.includes(enclosureId);
    }

    isForestZone(enclosureId) {
        return enclosureId === 'trio-bosque';
    }

    isRockyZone(enclosureId) {
        const rockyZones = ['pradera-progresiva', 'pradera-amor'];
        return rockyZones.includes(enclosureId);
    }

    validateEnclosureRules(enclosure, dinoType) {
        const enclosureType = enclosure.dataset.type;
        const existingDinos = enclosure.querySelectorAll('.placed-dinosaur img');
        
        switch (enclosureType) {
            case 'trio_bosque':
                return existingDinos.length < 3;
            case 'rey_selva':
            case 'banos':
                return existingDinos.length === 0;
            case 'pradera_amor':
                // Permite cualquier dinosaurio
                return true;
            case 'pradera_progresiva':
                // Solo especies diferentes
                const draggedDinoSrc = this.draggedCard.querySelector('img').src;
                return !Array.from(existingDinos).some(img => img.src === draggedDinoSrc);
            case 'cine_comida':
                // Permite cualquier dinosaurio
                return true;
            default:
                return true;
        }
    }

    // ==================== COLOCACIÓN DE DINOSAURIOS ==================== 
    placeDinosaurOnBoard(card, enclosure) {
        const dinoType = parseInt(card.dataset.type);
        const position = parseInt(card.dataset.position);
        const enclosureId = enclosure.dataset.id;

        // Crear dinosaurio colocado
        const placedDino = document.createElement('div');
        placedDino.className = 'placed-dinosaur';
        
        const img = document.createElement('img');
        img.src = card.querySelector('img').src;
        img.alt = card.querySelector('img').alt;
        placedDino.appendChild(img);

        // Añadir al recinto
        enclosure.querySelector('.enclosure-content').appendChild(placedDino);

        // Actualizar estado del juego
        const currentHand = this.currentPlayer === 1 ? this.boardState.player1Hand : this.boardState.player2Hand;
        const dinoInHand = currentHand.find(d => d.position === position);
        if (dinoInHand) {
            dinoInHand.isPlayed = true;
        }

        // Actualizar tablero del jugador
        const currentBoard = this.currentPlayer === 1 ? this.boardState.player1Board : this.boardState.player2Board;
        if (!currentBoard[enclosureId]) {
            currentBoard[enclosureId] = [];
        }
        currentBoard[enclosureId].push(dinoType);

        // Habilitar botón de finalizar turno
        const endBtn = document.getElementById('end-turn-btn');
        if (endBtn) endBtn.disabled = false;

        this.renderCurrentPlayerHand();
        this.updateGameUI();
        this.showToast('Dinosaurio colocado correctamente', 'success');
    }

    // ==================== FINALIZAR TURNO ==================== 
    finalizarTurno() {
        // Verificar si el jugador actual terminó sus cartas
        const currentHand = this.currentPlayer === 1 ? this.boardState.player1Hand : this.boardState.player2Hand;
        const cardsLeft = currentHand.filter(d => !d.isPlayed).length;
        
        if (cardsLeft === 0) {
            this.checkRoundEnd();
            return;
        }
        
        // Cambiar al siguiente jugador
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.currentTurn++;
        
        // Limpiar restricción anterior
        this.diceRestriction = null;
        this.restrictedPlayer = null;
        
        // Deshabilitar botón hasta colocar dinosaurio
        const endBtn = document.getElementById('end-turn-btn');
        if (endBtn) endBtn.disabled = true;
        
        this.updateGameUI();
        this.renderCurrentPlayerHand();
        
        // Iniciar animación de dado para el nuevo jugador
        this.iniciarAnimacionDado();
    }

    // ==================== GESTIÓN DE RONDAS ==================== 
    checkRoundEnd() {
        // Verificar si ambos jugadores terminaron sus cartas
        const player1CardsLeft = this.boardState.player1Hand.filter(d => !d.isPlayed).length;
        const player2CardsLeft = this.boardState.player2Hand.filter(d => !d.isPlayed).length;
        
        if (player1CardsLeft === 0 && player2CardsLeft === 0) {
            // Calcular puntuaciones de la ronda
            this.calculateRoundScores();
            
            if (this.currentRound >= 2) {
                // Fin del juego
                this.endGame();
            } else {
                // Mostrar resumen de ronda
                this.showRoundSummary();
            }
        }
    }

    calculateRoundScores() {
        this.boardState.player1Score = this.calculatePlayerScore(1);
        this.boardState.player2Score = this.calculatePlayerScore(2);
    }

    calculatePlayerScore(playerNumber) {
        const playerBoard = playerNumber === 1 ? this.boardState.player1Board : this.boardState.player2Board;
        let totalScore = 0;

        Object.entries(playerBoard).forEach(([enclosureId, dinosaurs]) => {
            totalScore += this.calculateEnclosureScore(enclosureId, dinosaurs, playerNumber);
        });

        return totalScore;
    }

    calculateEnclosureScore(enclosureId, dinosaurs, playerNumber) {
        const dinoCount = dinosaurs.length;
        
        switch (enclosureId) {
            case 'pradera-progresiva':
                // Puntos progresivos: 2, 4, 8, 12, 18, 24
                const progressivePoints = [0, 2, 4, 8, 12, 18, 24];
                return progressivePoints[Math.min(dinoCount, 6)] || 0;
                
            case 'trio-bosque':
                // 7 puntos si hay exactamente 3 dinosaurios
                return dinoCount === 3 ? 7 : 0;
                
            case 'rey-selva':
                // 7 puntos si no tienes menos dinosaurios que el rival en este recinto
                const opponentBoard = playerNumber === 1 ? this.boardState.player2Board : this.boardState.player1Board;
                const opponentCount = opponentBoard[enclosureId]?.length || 0;
                return dinoCount >= opponentCount ? 7 : 0;
                
            case 'banos':
                // 7 puntos si es el único dinosaurio en todo tu zoológico de esta especie
                if (dinoCount !== 1) return 0;
                const dinoType = dinosaurs[0];
                const allPlayerDinos = Object.values(playerNumber === 1 ? this.boardState.player1Board : this.boardState.player2Board).flat();
                const sameSpeciesCount = allPlayerDinos.filter(d => d === dinoType).length;
                return sameSpeciesCount === 1 ? 7 : 0;
                
            case 'pradera-amor':
                // 5 puntos por cada pareja de la misma especie
                const speciesCounts = {};
                dinosaurs.forEach(dino => {
                    speciesCounts[dino] = (speciesCounts[dino] || 0) + 1;
                });
                let pairs = 0;
                Object.values(speciesCounts).forEach(count => {
                    pairs += Math.floor(count / 2);
                });
                return pairs * 5;
                
            case 'cine-comida':
                // Puntos progresivos: 1, 3, 6, 10, 15, 21
                const cinemaPoints = [0, 1, 3, 6, 10, 15, 21];
                return cinemaPoints[Math.min(dinoCount, 6)] || 0;
                
            case 'rio':
                // 1 punto por dinosaurio
                return dinoCount;
                
            default:
                return 0;
        }
    }

    showRoundSummary() {
        // Actualizar información del resumen
        const player1Name = this.gameSession?.player1?.name || this.user?.username || 'Jugador 1';
        const player2Name = this.gameSession?.player2?.name || 'Jugador 2';
        
        document.getElementById('summary-player1-name').textContent = player1Name;
        document.getElementById('summary-player2-name').textContent = player2Name;
        document.getElementById('summary-player1-score').textContent = `${this.boardState.player1Score} puntos`;
        document.getElementById('summary-player2-score').textContent = `${this.boardState.player2Score} puntos`;
        
        this.showScreen('resumen-ronda');
    }

    iniciarSiguienteRonda() {
        this.currentRound++;
        this.currentTurn = 1;
        this.currentPlayer = 1;
        this.diceRestriction = null;
        this.restrictedPlayer = null;
        
        // Limpiar tablero
        document.querySelectorAll('.placed-dinosaur').forEach(dino => dino.remove());
        
        // Generar nuevas manos
        this.boardState.player1Hand = [];
        this.boardState.player2Hand = [];
        this.boardState.player1Board = {};
        this.boardState.player2Board = {};
        
        this.generateInitialHands();
        this.showScreen('partida');
        this.updateGameUI();
        
        // Iniciar con animación de dado
        this.iniciarAnimacionDado();
        this.showToast('¡Nueva ronda iniciada!', 'success');
    }

    // ==================== FIN DEL JUEGO ==================== 
    endGame() {
        // Determinar ganador
        const winner = this.boardState.player1Score > this.boardState.player2Score ? 1 : 
                      this.boardState.player1Score < this.boardState.player2Score ? 2 : 0;
        
        // Actualizar pantalla final
        const player1Name = this.gameSession?.player1?.name || this.user?.username || 'Jugador 1';
        const player2Name = this.gameSession?.player2?.name || 'Jugador 2';
        
        document.getElementById('final-player1-name').textContent = player1Name;
        document.getElementById('final-player2-name').textContent = player2Name;
        document.getElementById('final-player1-score').textContent = `${this.boardState.player1Score} puntos`;
        document.getElementById('final-player2-score').textContent = `${this.boardState.player2Score} puntos`;
        
        // Configurar podio
        const winnerAvatar = document.getElementById('winner-avatar');
        const runnerUpAvatar = document.getElementById('runner-up-avatar');
        
        if (winner === 1) {
            winnerAvatar.src = 'img/foto_usuario-1.png';
            runnerUpAvatar.src = 'img/invitado.png';
        } else if (winner === 2) {
            winnerAvatar.src = 'img/invitado.png';
            runnerUpAvatar.src = 'img/foto_usuario-1.png';
        } else {
            // Empate - mostrar ambos en primer lugar
            winnerAvatar.src = 'img/foto_usuario-1.png';
            runnerUpAvatar.src = 'img/invitado.png';
        }
        
        this.showScreen('fin-juego');
        this.showToast(winner === 0 ? '¡Empate!' : `¡${winner === 1 ? player1Name : player2Name} gana!`, 'success');
    }

    nuevaPartida() {
        // Reiniciar estado del juego
        this.gameSession = null;
        this.boardState = null;
        this.currentPlayer = 1;
        this.currentRound = 1;
        this.currentTurn = 1;
        this.diceRestriction = null;
        this.restrictedPlayer = null;
        
        // Volver a configuración de jugadores
        this.showScreen('jugadores');
    }

    // ==================== VER MAPA OPONENTE ==================== 
    mostrarMapaOponente() {
        const popup = document.getElementById('map-popup');
        const opponentBoard = document.getElementById('opponent-board-grid');
        const opponentScores = document.getElementById('opponent-scores');
        
        if (!popup || !opponentBoard || !opponentScores) return;
        
        // Actualizar título
        const opponentName = this.currentPlayer === 1 ? 
            (this.gameSession?.player2?.name || 'Jugador 2') : 
            (this.gameSession?.player1?.name || this.user?.username || 'Jugador 1');
        
        document.getElementById('map-popup-title').textContent = `Tablero de ${opponentName}`;
        
        // Clonar tablero principal
        const mainBoard = document.querySelector('.board-grid');
        opponentBoard.innerHTML = mainBoard.innerHTML;
        
        // Mostrar solo dinosaurios del oponente
        const opponentPlayerBoard = this.currentPlayer === 1 ? this.boardState.player2Board : this.boardState.player1Board;
        
        // Limpiar y mostrar solo dinosaurios del oponente
        opponentBoard.querySelectorAll('.placed-dinosaur').forEach(dino => dino.remove());
        
        Object.entries(opponentPlayerBoard).forEach(([enclosureId, dinosaurs]) => {
            const enclosure = opponentBoard.querySelector(`[data-id="${enclosureId}"]`);
            if (enclosure) {
                const content = enclosure.querySelector('.enclosure-content');
                dinosaurs.forEach(dinoType => {
                    const placedDino = document.createElement('div');
                    placedDino.className = 'placed-dinosaur';
                    
                    const img = document.createElement('img');
                    img.src = `img/dino-${this.getDinoName(dinoType)}.png`;
                    img.alt = this.getDinoName(dinoType);
                    placedDino.appendChild(img);
                    
                    content.appendChild(placedDino);
                });
            }
        });
        
        // Mostrar puntuaciones por recinto
        this.updateOpponentScores(opponentScores, this.currentPlayer === 1 ? 2 : 1);
        
        popup.style.display = 'flex';
    }

    getDinoName(dinoType) {
        const names = {
            1: 'triceratops',
            2: 'brachiosaurus', 
            3: 'stegosaurus',
            4: 'parasaurolophus',
            5: 'compsognathus',
            6: 'trex'
        };
        return names[dinoType] || 'triceratops';
    }

    updateOpponentScores(container, playerNumber) {
        const playerBoard = playerNumber === 1 ? this.boardState.player1Board : this.boardState.player2Board;
        const enclosureNames = {
            'pradera-progresiva': 'Pradera Progresiva',
            'trio-bosque': 'Trío del Bosque',
            'rey-selva': 'Rey de la Selva',
            'banos': 'Baños',
            'pradera-amor': 'Pradera del Amor',
            'cine-comida': 'Cine/Comida',
            'rio': 'Río'
        };
        
        container.innerHTML = '';
        
        Object.entries(playerBoard).forEach(([enclosureId, dinosaurs]) => {
            const score = this.calculateEnclosureScore(enclosureId, dinosaurs, playerNumber);
            
            const scoreItem = document.createElement('div');
            scoreItem.className = 'score-item';
            scoreItem.innerHTML = `
                <h4>${enclosureNames[enclosureId] || enclosureId}</h4>
                <div class="points">${score} pts</div>
            `;
            
            container.appendChild(scoreItem);
        });
        
        // Mostrar total
        const totalScore = this.calculatePlayerScore(playerNumber);
        const totalItem = document.createElement('div');
        totalItem.className = 'score-item';
        totalItem.style.background = 'var(--color-naranja)';
        totalItem.innerHTML = `
            <h4>TOTAL</h4>
            <div class="points">${totalScore} pts</div>
        `;
        container.appendChild(totalItem);
    }

    cerrarMapaOponente() {
        const popup = document.getElementById('map-popup');
        if (popup) popup.style.display = 'none';
    }

    // ==================== ACTUALIZACIÓN DE UI ==================== 
    updateGameUI() {
        if (!this.boardState) return;
        
        // Actualizar header
        const opponentPlayer = this.currentPlayer === 1 ? 2 : 1;
        const opponentName = opponentPlayer === 1 ? 
            (this.gameSession?.player1?.name || this.user?.username || 'Jugador 1') :
            (this.gameSession?.player2?.name || 'Jugador 2');
        const opponentScore = opponentPlayer === 1 ? this.boardState.player1Score : this.boardState.player2Score;
        
        document.getElementById('opponent-name').textContent = opponentName;
        document.getElementById('opponent-score').textContent = `${opponentScore} puntos`;
        document.getElementById('round-info').textContent = `Ronda ${this.currentRound}/2`;
        
        // Actualizar footer
        const currentPlayerName = this.currentPlayer === 1 ? 
            (this.gameSession?.player1?.name || this.user?.username || 'Jugador 1') :
            (this.gameSession?.player2?.name || 'Jugador 2');
            
        document.getElementById('current-player-name').textContent = currentPlayerName;
        document.getElementById('turn-status').textContent = 'Es tu turno';
        
        // Actualizar restricción del dado
        const restrictionDiv = document.getElementById('dice-restriction');
        if (this.diceRestriction && this.restrictedPlayer === this.currentPlayer) {
            const restrictionImg = document.getElementById('restriction-dice-img');
            const restrictionText = document.getElementById('restriction-text');
            
            restrictionImg.src = `img/dado-${this.diceRestriction}.png`;
            
            const restrictionTexts = {
                1: 'Adyacente a baños',
                2: 'Recinto ocupado',
                3: 'Sin T-Rex',
                4: 'Adyacente a cafetería',
                5: 'Zona boscosa',
                6: 'Zona rocosa'
            };
            
            restrictionText.textContent = restrictionTexts[this.diceRestriction] || '';
            restrictionDiv.style.display = 'flex';
        } else {
            restrictionDiv.style.display = 'none';
        }
        
        // Actualizar avatares
        const currentAvatar = document.getElementById('current-player-avatar');
        const opponentAvatar = document.getElementById('opponent-avatar');
        
        if (this.currentPlayer === 1) {
            currentAvatar.src = 'img/foto_usuario-1.png';
            opponentAvatar.src = 'img/invitado.png';
        } else {
            currentAvatar.src = 'img/invitado.png';
            opponentAvatar.src = 'img/foto_usuario-1.png';
        }
    }

    // ==================== MÉTODOS HEREDADOS (LOGIN, REGISTRO, ETC.) ==================== 
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
                message: 'Por favor ingresa tu fecha de nacimiento'
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
            this.cerrarMapaOponente();
        }
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
            setTimeout(() => {
                this.updateGameUI();
            }, 100);
        }
    }

    updateLobbyData(user) {
        const nameElement = document.querySelector('#pantalla-lobby .titulo--lg');
        if (nameElement) {
            nameElement.textContent = user.name || user.username.toUpperCase();
        }

        if (user.stats) {
            const partidasGanadas = document.getElementById('partidas-ganadas');
            const partidasPerdidas = document.getElementById('partidas-perdidas');
            
            if (partidasGanadas) partidasGanadas.textContent = user.stats.won || 0;
            if (partidasPerdidas) partidasPerdidas.textContent = user.stats.lost || 0;
        }
    }

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

    // ==================== SISTEMA DE VALIDACIONES AVANZADAS ==================== 
    validateEnclosureCapacity(enclosureId) {
        const enclosure = document.querySelector(`[data-id="${enclosureId}"]`);
        if (!enclosure) return false;

        const capacity = enclosure.querySelector('.capacity-indicator').textContent;
        const currentCount = enclosure.querySelectorAll('.placed-dinosaur').length;

        return capacity === '∞' || currentCount < parseInt(capacity);
    }

    validateSpecificEnclosureRules(enclosureId, dinoType) {
        const enclosure = document.querySelector(`[data-id="${enclosureId}"]`);
        if (!enclosure) return false;

        const enclosureType = enclosure.dataset.type;
        const existingDinos = Array.from(enclosure.querySelectorAll('.placed-dinosaur img'));

        switch (enclosureType) {
            case 'pradera_progresiva':
                // Solo especies diferentes
                const draggedDinoSrc = this.draggedCard?.querySelector('img')?.src;
                return !existingDinos.some(img => img.src === draggedDinoSrc);

            case 'trio_bosque':
                // Máximo 3 dinosaurios
                return existingDinos.length < 3;

            case 'rey_selva':
            case 'banos':
                // Solo 1 dinosaurio
                return existingDinos.length === 0;

            case 'pradera_amor':
            case 'cine_comida':
            case 'rio':
                // Sin restricciones especiales
                return true;

            default:
                return true;
        }
    }

    // ==================== GESTIÓN DE EFECTOS VISUALES ==================== 
    animateCardPlacement(card, enclosure) {
        return new Promise((resolve) => {
            card.style.transition = 'all 0.5s ease';
            card.style.transform = 'scale(0.8) rotate(10deg)';
            card.style.opacity = '0.7';

            setTimeout(() => {
                card.style.transform = 'scale(1) rotate(0deg)';
                card.style.opacity = '1';
                resolve();
            }, 200);
        });
    }

    highlightValidEnclosures() {
        if (!this.draggedCard) return;

        const dinoType = parseInt(this.draggedCard.dataset.type);

        document.querySelectorAll('.enclosure').forEach(enclosure => {
            const isValid = this.canPlaceInEnclosure(enclosure);
            
            if (isValid) {
                enclosure.classList.add('valid-drop');
            } else {
                enclosure.classList.add('invalid-drop');
            }
        });
    }

    clearEnclosureHighlights() {
        document.querySelectorAll('.enclosure').forEach(enclosure => {
            enclosure.classList.remove('valid-drop', 'invalid-drop', 'drag-over');
        });
    }

    // ==================== SISTEMA DE PUNTUACIONES EN TIEMPO REAL ==================== 
    updateLiveScores() {
        const player1Score = this.calculatePlayerScore(1);
        const player2Score = this.calculatePlayerScore(2);

        // Actualizar scores en header y footer si es necesario
        const scoreElements = document.querySelectorAll('[id*="score"]');
        scoreElements.forEach(element => {
            if (element.id.includes('player1') || element.id.includes('opponent')) {
                const displayScore = this.currentPlayer === 1 ? player2Score : player1Score;
                element.textContent = `${displayScore} puntos`;
            }
        });
    }

    // ==================== MANEJO DE ESTADOS DE JUEGO AVANZADO ==================== 
    saveGameState() {
        if (!this.boardState) return;

        const gameState = {
            currentPlayer: this.currentPlayer,
            currentRound: this.currentRound,
            currentTurn: this.currentTurn,
            diceRestriction: this.diceRestriction,
            restrictedPlayer: this.restrictedPlayer,
            player1Hand: this.boardState.player1Hand,
            player2Hand: this.boardState.player2Hand,
            player1Board: this.boardState.player1Board,
            player2Board: this.boardState.player2Board,
            player1Score: this.boardState.player1Score,
            player2Score: this.boardState.player2Score,
            timestamp: Date.now()
        };

        // Guardar en memoria (no localStorage por restricciones de Claude)
        this.savedGameState = gameState;
    }

    loadGameState() {
        if (!this.savedGameState) return false;

        const state = this.savedGameState;
        
        this.currentPlayer = state.currentPlayer;
        this.currentRound = state.currentRound;
        this.currentTurn = state.currentTurn;
        this.diceRestriction = state.diceRestriction;
        this.restrictedPlayer = state.restrictedPlayer;
        
        this.boardState = {
            currentPlayer: state.currentPlayer,
            currentRound: state.currentRound,
            currentTurn: state.currentTurn,
            diceRestriction: state.diceRestriction,
            restrictedPlayer: state.restrictedPlayer,
            player1Hand: state.player1Hand,
            player2Hand: state.player2Hand,
            player1Board: state.player1Board,
            player2Board: state.player2Board,
            player1Score: state.player1Score,
            player2Score: state.player2Score
        };

        return true;
    }

    // ==================== SISTEMA DE AYUDA Y TUTORIAL ==================== 
    showGameHelp() {
        const helpText = `
        <div class="game-help">
            <h3>¿Cómo jugar Draftosaurus?</h3>
            <ol>
                <li><strong>Lanza el dado</strong> - La restricción afecta al oponente</li>
                <li><strong>Arrastra dinosaurios</strong> - Coloca en recintos válidos</li>
                <li><strong>Finaliza turno</strong> - Pasa al siguiente jugador</li>
                <li><strong>Completa 2 rondas</strong> - 6 dinosaurios por ronda</li>
            </ol>
            <h4>Recintos:</h4>
            <ul>
                <li><strong>Pradera Progresiva:</strong> 2,4,8,12,18,24 puntos (especies diferentes)</li>
                <li><strong>Trío del Bosque:</strong> 7 puntos si hay exactamente 3</li>
                <li><strong>Rey de la Selva:</strong> 7 puntos si no tienes menos que rival</li>
                <li><strong>Baños:</strong> 7 puntos si es única especie en tu zoo</li>
                <li><strong>Pradera del Amor:</strong> 5 puntos por pareja</li>
                <li><strong>Cine/Comida:</strong> 1,3,6,10,15,21 puntos</li>
                <li><strong>Río:</strong> 1 punto por dinosaurio</li>
            </ul>
        </div>
        `;

        this.showToast(helpText, 'info');
    }

    // ==================== MANEJO DE ERRORES MEJORADO ==================== 
    handleGameError(error, context = '') {
        console.error(`Game Error [${context}]:`, error);
        
        const errorMessages = {
            'network': 'Error de conexión. Verifica tu internet.',
            'validation': 'Movimiento no válido. Intenta de nuevo.',
            'server': 'Error del servidor. Reintenta en unos momentos.',
            'game_state': 'Error en el estado del juego. Reiniciando...',
            'unknown': 'Error inesperado. Por favor recarga la página.'
        };

        const errorType = this.determineErrorType(error);
        const message = errorMessages[errorType] || errorMessages.unknown;

        this.showToast(message, 'error');

        // Auto-recovery en ciertos casos
        if (errorType === 'game_state') {
            setTimeout(() => {
                this.attemptGameRecovery();
            }, 2000);
        }
    }

    determineErrorType(error) {
        if (error.message?.includes('fetch') || error.message?.includes('network')) {
            return 'network';
        }
        if (error.message?.includes('validation') || error.message?.includes('restrict')) {
            return 'validation';
        }
        if (error.status >= 500) {
            return 'server';
        }
        if (error.message?.includes('state') || error.message?.includes('undefined')) {
            return 'game_state';
        }
        return 'unknown';
    }

    attemptGameRecovery() {
        if (this.loadGameState()) {
            this.updateGameUI();
            this.renderCurrentPlayerHand();
            this.showToast('Juego recuperado exitosamente', 'success');
        } else {
            this.showToast('No se pudo recuperar el juego. Reinicia la partida.', 'error');
        }
    }

    // ==================== OPTIMIZACIONES DE RENDIMIENTO ==================== 
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

    // ==================== UTILIDADES AVANZADAS ==================== 
    generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
    }

    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // ==================== UTILIDADES HEREDADAS ==================== 
    logout() {
        this.user = null;
        this.gameSession = null;
        this.boardState = null;
        this.savedGameState = null;
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

    // ==================== SISTEMA DE LOGS Y DEBUG ==================== 
    log(message, type = 'info', data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            type,
            message,
            data,
            gameState: this.boardState ? {
                currentPlayer: this.currentPlayer,
                currentRound: this.currentRound,
                currentTurn: this.currentTurn
            } : null
        };

        console.log(`[DRAFTOSAURUS ${type.toUpperCase()}] ${message}`, data);
        
        // Guardar logs en memoria para debugging
        if (!this.gameLogs) this.gameLogs = [];
        this.gameLogs.push(logEntry);
        
        // Mantener solo los últimos 50 logs
        if (this.gameLogs.length > 50) {
            this.gameLogs = this.gameLogs.slice(-50);
        }
    }

    exportGameLogs() {
        if (!this.gameLogs || this.gameLogs.length === 0) {
            this.showToast('No hay logs para exportar', 'info');
            return;
        }

        const logsText = JSON.stringify(this.gameLogs, null, 2);
        const blob = new Blob([logsText], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `draftosaurus-logs-${Date.now()}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        this.showToast('Logs exportados exitosamente', 'success');
    }

    // ==================== MEJORAS EN DRAG AND DROP ==================== 
    enhancedHandleDragStart(e) {
        this.handleDragStart(e);
        this.highlightValidEnclosures();
        this.log('Drag started', 'debug', { dinoType: e.target.dataset.type });
    }

    enhancedHandleDragEnd(e) {
        this.handleDragEnd(e);
        this.clearEnclosureHighlights();
        this.log('Drag ended', 'debug');
    }

    enhancedHandleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');

        if (!this.draggedCard || !this.canPlaceInEnclosure(e.currentTarget)) {
            this.showToast('No puedes colocar aquí', 'error');
            this.log('Invalid drop attempt', 'warning', { 
                enclosure: e.currentTarget.dataset.id,
                restriction: this.diceRestriction 
            });
            return;
        }

        this.log('Valid drop', 'info', { 
            enclosure: e.currentTarget.dataset.id,
            dinoType: this.draggedCard.dataset.type 
        });

        this.placeDinosaurOnBoard(this.draggedCard, e.currentTarget);
        this.clearEnclosureHighlights();
    }
}

// ==================== EXTENSIONES DE LA CLASE PARA FUNCIONALIDADES ADICIONALES ==================== 

// Extensión para manejo de sonidos (si se implementa en el futuro)
AppState.prototype.playSound = function(soundName) {
    // Placeholder para sistema de sonidos
    this.log(`Sound played: ${soundName}`, 'debug');
};

// Extensión para estadísticas de partida
AppState.prototype.getGameStatistics = function() {
    if (!this.boardState) return null;

    return {
        turnsPlayed: this.currentTurn,
        currentRound: this.currentRound,
        player1DinosPlayed: this.boardState.player1Hand.filter(d => d.isPlayed).length,
        player2DinosPlayed: this.boardState.player2Hand.filter(d => d.isPlayed).length,
        restrictionsApplied: this.diceRestriction ? 1 : 0,
        gameTimeMs: Date.now() - (this.gameStartTime || Date.now())
    };
};

// ==================== INICIALIZACIÓN ==================== 
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AppState();
    
    // Configuración adicional de debugging en desarrollo
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.debug = {
            app: window.app,
            exportLogs: () => window.app.exportGameLogs(),
            showHelp: () => window.app.showGameHelp(),
            getStats: () => window.app.getGameStatistics()
        };
        console.log('Debug tools available at window.debug');
    }
});

// ==================== PWA FEATURES ==================== 
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered:', registration);
                window.app?.log('Service Worker registered', 'info');
            })
            .catch(error => {
                console.log('SW registration failed:', error);
                window.app?.log('Service Worker registration failed', 'error', error);
            });
    });
}

// ==================== MANEJO DE ERRORES GLOBALES ==================== 
window.addEventListener('error', (event) => {
    if (window.app) {
        window.app.handleGameError(event.error, 'global');
        window.app.log('Global error caught', 'error', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno
        });
    }
});

window.addEventListener('unhandledrejection', (event) => {
    if (window.app) {
        window.app.handleGameError(event.reason, 'promise');
        window.app.log('Unhandled promise rejection', 'error', event.reason);
    }
});

// ==================== EVENTOS DE VISIBILIDAD DE PÁGINA ==================== 
document.addEventListener('visibilitychange', () => {
    if (window.app && window.app.boardState) {
        if (document.hidden) {
            window.app.saveGameState();
            window.app.log('Game state saved (page hidden)', 'info');
        } else {
            window.app.log('Page visible again', 'info');
        }
    }
}); DE FORMULARIOS ==================== 
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