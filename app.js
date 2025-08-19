// ==================== TEST SIMPLE PARA PANTALLA BLANCA ==================== 
console.log('🎯 JavaScript cargado correctamente');

// Verificar que el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM cargado');
    
    // Test básico: mostrar pantalla de login
    setTimeout(() => {
        console.log('🔄 Intentando mostrar login...');
        showLogin();
    }, 1000);
});

function showLogin() {
    try {
        // Ocultar pantalla de carga
        const carga = document.getElementById('pantalla-carga');
        if (carga) {
            carga.style.display = 'none';
            console.log('✅ Pantalla de carga ocultada');
        }
        
        // Mostrar pantalla de login
        const login = document.getElementById('pantalla-login');
        if (login) {
            login.style.display = 'block';
            console.log('✅ Pantalla de login mostrada');
        } else {
            console.error('❌ No se encontró pantalla-login');
        }
        
        // Verificar que se ve algo
        document.body.style.backgroundColor = '#000000';
        console.log('✅ Test completado');
        
    } catch (error) {
        console.error('❌ Error en showLogin:', error);
    }
}

// Test adicional: verificar que las pantallas existen
window.addEventListener('load', () => {
    console.log('🔍 Verificando elementos HTML...');
    
    const elementos = [
        'pantalla-carga',
        'pantalla-login', 
        'pantalla-registro',
        'pantalla-lobby'
    ];
    
    elementos.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            console.log(`✅ Encontrado: ${id}`);
        } else {
            console.error(`❌ No encontrado: ${id}`);
        }
    });
});