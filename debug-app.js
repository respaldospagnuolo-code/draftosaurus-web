// debug-app.js - Versión simplificada para diagnosticar el problema

console.log('🦕 Debug app.js cargando...');

class DebugAppState {
    constructor() {
        console.log('🔧 Creando DebugAppState...');
        this.currentScreen = 'carga';
        this.user = null;
        this.loading = false;
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        console.log('🎧 Configurando event listeners...');
        document.addEventListener('DOMContentLoaded', () => this.init());
        window.addEventListener('error', (e) => this.handleGlobalError(e));
    }

    async init() {
        console.log('🚀 Iniciando DebugAppState...');
        
        try {
            // Mostrar pantalla de carga
            console.log('📺 Mostrando pantalla de carga...');
            this.showScreen('carga');
            
            // Simular progreso de carga
            this.updateProgress(10);
            
            // Verificar sesión existente
            console.log('🔍 Verificando sesión existente...');
            this.updateProgress(30);
            await this.checkExistingSession();
            
            // Cargar configuración
            console.log('⚙️ Cargando configuración...');
            this.updateProgress(60);
            await this.loadGameConfiguration();
            
            // Simular PWA
            console.log('📱 Inicializando PWA...');
            this.updateProgress(80);
            this.initializePWA();
            
            // Mostrar pantalla de login
            console.log('🔑 Mostrando pantalla de login...');
            this.updateProgress(100);
            
            setTimeout(() => {
                this.showScreen('login');
                console.log('✅ Draftosaurus iniciado correctamente');
            }, 1000);
            
        } catch (error) {
            console.error('❌ Error al iniciar:', error);
            this.showToast('Error al inicializar el juego: ' + error.message, 'error');
            
            // Intentar mostrar login de todas formas
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
        console.log(`📊 Progreso: ${percent}%`);
    }

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
            
            this.currentScreen = screenName;
            this.configureScreen(screenName);
        } else {
            console.error(`❌ No se encontró la pantalla: pantalla-${screenName}`);
        }
    }

    configureScreen(screenName) {
        console.log(`🔧 Configurando pantalla: ${screenName}`);
        
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
        }
    }

    setupLoginScreen() {
        console.log('🔑 Configurando pantalla de login...');
        
        const form = document.getElementById('login-form');
        const registerLink = document.getElementById('register-link');
        
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                console.log('📝 Formulario de login enviado');
                this.handleLogin(e);
            };
        }
        
        if (registerLink) {
            registerLink.onclick = (e) => {
                e.preventDefault();
                console.log('🔗 Enlace a registro clickeado');
                this.showScreen('register');
            };
        }
        
        // Auto-focus en email
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.focus();
        }
    }

    setupRegisterScreen() {
        console.log('📝 Configurando pantalla de registro...');
        
        const form = document.getElementById('register-form');
        const loginLink = document.getElementById('login-link');
        
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                console.log('📝 Formulario de registro enviado');
                this.handleRegister(e);
            };
        }
        
        if (loginLink) {
            loginLink.onclick = (e) => {
                e.preventDefault();
                console.log('🔗 Enlace a login clickeado');
                this.showScreen('login');
            };
        }
    }

    setupLobbyScreen() {
        console.log('🏠 Configurando pantalla de lobby...');
        
        const newGameBtn = document.getElementById('new-game-btn');
        const logoutBtn = document.getElementById('logout-btn');
        
        if (newGameBtn) {
            newGameBtn.onclick = () => {
                console.log('🎮 Botón nueva partida clickeado');
                this.showToast('Nueva partida - En desarrollo', 'info');
            };
        }
        
        if (logoutBtn) {
            logoutBtn.onclick = () => {
                console.log('🚪 Botón logout clickeado');
                this.logout();
            };
        }
        
        this.updateUserInfo();
    }

    async handleLogin(e) {
        console.log('🔑 Procesando login...');
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        if (!email || !password) {
            this.showToast('Email y contraseña son requeridos', 'error');
            return;
        }
        
        this.setLoading(true);
        
        try {
            const response = await fetch('login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            console.log('📥 Respuesta login:', data);
            
            if (data.success) {
                this.user = data.user;
                this.showToast('¡Bienvenido!', 'success');
                this.saveUserSession();
                this.showScreen('lobby');
            } else {
                this.showToast(data.message || 'Error al iniciar sesión', 'error');
            }
        } catch (error) {
            console.error('❌ Error en login:', error);
            this.showToast('Error de conexión', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async handleRegister(e) {
        console.log('📝 Procesando registro...');
        
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        const birthdate = document.getElementById('register-fecha').value;
        
        // Validaciones básicas
        if (!username || !email || !password || !confirmPassword || !birthdate) {
            this.showToast('Todos los campos son requeridos', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showToast('Las contraseñas no coinciden', 'error');
            return;
        }
        
        this.setLoading(true);
        
        try {
            const response = await fetch('register.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, birthdate })
            });
            
            const data = await response.json();
            console.log('📥 Respuesta registro:', data);
            
            if (data.success) {
                this.showToast('¡Cuenta creada exitosamente!', 'success');
                this.showScreen('login');
                // Pre-llenar el email
                document.getElementById('email').value = email;
            } else {
                this.showToast(data.message || 'Error al registrar usuario', 'error');
            }
        } catch (error) {
            console.error('❌ Error en registro:', error);
            this.showToast('Error de conexión', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async checkExistingSession() {
        console.log('🔍 Verificando sesión existente...');
        
        const savedUser = localStorage.getItem('draftosaurus_user');
        if (savedUser) {
            try {
                this.user = JSON.parse(savedUser);
                console.log('👤 Usuario guardado encontrado:', this.user);
                
                // Verificar si la sesión sigue siendo válida
                const response = await fetch('verify-session.php');
                const data = await response.json();
                
                console.log('📥 Verificación sesión:', data);
                
                if (data.success && data.valid) {
                    console.log('✅ Sesión válida, ir a lobby');
                    this.showScreen('lobby');
                    return;
                } else {
                    console.log('❌ Sesión inválida, limpiar datos');
                    localStorage.removeItem('draftosaurus_user');
                    this.user = null;
                }
            } catch (error) {
                console.error('❌ Error verificando sesión:', error);
                localStorage.removeItem('draftosaurus_user');
                this.user = null;
            }
        }
    }

    async loadGameConfiguration() {
        console.log('⚙️ Cargando configuración del juego...');
        
        try {
            const response = await fetch('config.php');
            
            if (response.ok) {
                const text = await response.text();
                console.log('📄 Respuesta config.php:', text.substring(0, 200) + '...');
                
                // Intentar parsear como JSON si es posible
                try {
                    const config = JSON.parse(text);
                    console.log('✅ Configuración cargada como JSON:', config);
                } catch (jsonError) {
                    console.log('⚠️ config.php no retorna JSON válido, pero está disponible');
                }
            } else {
                console.warn('⚠️ config.php respondió con status:', response.status);
            }
        } catch (error) {
            console.error('❌ Error cargando configuración:', error);
            // No lanzar error, usar configuración por defecto
        }
    }

    initializePWA() {
        console.log('📱 Inicializando PWA...');
        // Implementación simplificada
        if ('serviceWorker' in navigator) {
            console.log('✅ Service Worker disponible');
        } else {
            console.log('❌ Service Worker no disponible');
        }
    }

    saveUserSession() {
        if (this.user) {
            localStorage.setItem('draftosaurus_user', JSON.stringify(this.user));
            console.log('💾 Sesión de usuario guardada');
        }
    }

    logout() {
        console.log('🚪 Cerrando sesión...');
        this.user = null;
        localStorage.removeItem('draftosaurus_user');
        this.showToast('Sesión cerrada', 'info');
        this.showScreen('login');
    }

    updateUserInfo() {
        if (!this.user) return;
        
        const userElements = document.querySelectorAll('.user-name');
        userElements.forEach(el => {
            el.textContent = this.user.username || this.user.name;
        });
        
        console.log('👤 Información de usuario actualizada');
    }

    setLoading(isLoading) {
        console.log('⏳ Loading:', isLoading);
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

    showToast(message, type = 'info') {
        console.log(`🍞 Toast [${type}]: ${message}`);
        
        // Crear container si no existe
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        
        // Crear toast
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.innerHTML = `
            <div class="toast__content">
                <div class="toast__message">${message}</div>
                <button class="toast__close" onclick="this.parentElement.parentElement.remove()">✕</button>
            </div>
        `;
        
        container.appendChild(toast);
        
        // Mostrar con animación
        setTimeout(() => toast.classList.add('fade-in'), 100);
        
        // Auto-remover
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 4000);
    }

    handleGlobalError(event) {
        console.error('🚨 Error global:', event.error);
        this.showToast('Error inesperado: ' + (event.error?.message || 'Error desconocido'), 'error');
    }
}

// Inicialización
let debugApp;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🦕 DOM cargado, iniciando DebugAppState...');
    debugApp = new DebugAppState();
    window.debugApp = debugApp; // Para debug en consola
});

window.addEventListener('load', () => {
    console.log('🦕 Window load completo');
});

console.log('📄 debug-app.js cargado completamente');