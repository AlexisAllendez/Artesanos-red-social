// Funciones comunes para manejo de autenticación y usuario

// Variable global para el usuario actual
let currentUser = null;

// Función para verificar autenticación
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/check', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (!data.success || !data.authenticated) {
            window.location.href = '/login';
            return false;
        }

        if (data.user) {
            currentUser = data.user;
            updateUserInfo(data.user);
        }
        
        return true;
    } catch (error) {
        console.error('Error al verificar autenticación:', error);
        window.location.href = '/login';
        return false;
    }
}

// Función para actualizar información del usuario en la UI
function updateUserInfo(user) {
    const userNameElement = document.getElementById('userName');
    const userAvatarElement = document.querySelector('#userDropdown img');
    
    if (userNameElement) {
        userNameElement.textContent = `${user.nombre} ${user.apellido}`;
    }
    
    if (userAvatarElement && user.avatar) {
        userAvatarElement.src = user.avatar;
    } else if (userAvatarElement) {
        userAvatarElement.src = '/img/default-avatar.png';
    }
}

// Función para manejar logout
async function handleLogout(e) {
    if (e) e.preventDefault();
    
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });

        if (response.ok) {
            window.location.href = '/login';
        } else {
            console.error('Error al cerrar sesión');
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        window.location.href = '/login';
    }
}

// Función para configurar eventos comunes
function setupCommonEvents() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// Función para inicializar autenticación en cualquier página
async function initAuth() {
    const isAuthenticated = await checkAuth();
    if (isAuthenticated) {
        setupCommonEvents();
    }
    return isAuthenticated;
}

// Exportar funciones para uso en otros archivos
window.authUtils = {
    checkAuth,
    updateUserInfo,
    handleLogout,
    setupCommonEvents,
    initAuth,
    currentUser
}; 