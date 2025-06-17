// Aplicación principal - Manejo global de sesión y Socket.IO

// Estado global de la aplicación
window.App = {
    // Usuario actual
    currentUser: null,
    
    // Socket.IO connection
    socket: null,
    
    // Estado de autenticación
    isAuthenticated: false,
    
    // Contador de notificaciones
    notificationCount: 0,
    
    // Callbacks para eventos
    eventCallbacks: {
        userUpdated: [],
        notificationReceived: [],
        socketConnected: [],
        socketDisconnected: []
    }
};

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Inicializando aplicación...');
    
    // Verificar autenticación
    const authResult = await checkAuth();
    
    if (authResult) {
        // Inicializar Socket.IO
        initializeSocket();
        
        // Configurar eventos comunes
        setupCommonEvents();
        
        // Actualizar UI
        updateUserInterface();
        
        // Cargar contador de notificaciones
        await loadNotificationCount();
        
        console.log('Aplicación inicializada correctamente');
    } else {
        console.log('Usuario no autenticado, redirigiendo a login...');
        window.location.href = '/login';
    }
});

// Función para verificar autenticación
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/check', {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success && data.authenticated) {
            App.currentUser = data.user;
            App.isAuthenticated = true;
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('Error al verificar autenticación:', error);
        return false;
    }
}

// Inicializar Socket.IO
function initializeSocket() {
    if (!App.currentUser) {
        console.error('No hay usuario para conectar Socket.IO');
        return;
    }
    
    App.socket = io();
    
    // Unirse a la sala del usuario
    App.socket.emit('join_user_room', App.currentUser.id);
    
    // Eventos de Socket.IO
    App.socket.on('connect', () => {
        triggerEvent('socketConnected');
    });
    
    App.socket.on('disconnect', () => {
        triggerEvent('socketDisconnected');
        
        // Intentar reconectar después de 5 segundos
        setTimeout(() => {
            if (App.socket && !App.socket.connected) {
                App.socket.connect();
            }
        }, 5000);
    });
    
    // Escuchar notificaciones
    App.socket.on('nueva_solicitud', (data) => {
        updateNotificationCount(1);
        triggerEvent('notificationReceived', { type: 'friend_request', data });
        showToast({
            title: 'Nueva solicitud de amistad',
            message: `${data.de.nombre} ${data.de.apellido} te envió una solicitud de amistad`,
            type: 'info'
        });
    });
    
    App.socket.on('amistad_aceptada', (data) => {
        updateNotificationCount(1);
        triggerEvent('notificationReceived', { type: 'friend_request_accepted', data });
        showToast({
            title: 'Solicitud aceptada',
            message: `${data.nombre} ${data.apellido} aceptó tu solicitud de amistad`,
            type: 'success'
        });
    });
    
    App.socket.on('nuevo_comentario', (data) => {
        updateNotificationCount(1);
        triggerEvent('notificationReceived', { type: 'new_comment', data });
        showToast({
            title: 'Nuevo comentario',
            message: `${data.nombre} ${data.apellido} comentó en tu imagen`,
            type: 'info'
        });
    });

    App.socket.on('imagen_compartida', (data) => {
        updateNotificationCount(1);
        triggerEvent('notificationReceived', { type: 'image_shared', data });
        showToast({
            title: 'Imagen compartida',
            message: `${data.nombre} ${data.apellido} compartió una imagen contigo`,
            type: 'info'
        });
    });

    App.socket.on('album_compartido', (data) => {
        updateNotificationCount(1);
        triggerEvent('notificationReceived', { type: 'album_shared', data });
        showToast({
            title: 'Álbum compartido',
            message: `${data.nombre} ${data.apellido} compartió un álbum contigo`,
            type: 'info'
        });
    });
    
    // Escuchar cierre del servidor
    App.socket.on('server_shutdown', (data) => {
        showToast({
            title: 'Servidor cerrando',
            message: data.message,
            type: 'warning',
            duration: 10000
        });
        
        // Desconectar socket después de mostrar el mensaje
        setTimeout(() => {
            if (App.socket) {
                App.socket.disconnect();
            }
        }, 2000);
    });
}

// Configurar eventos comunes
function setupCommonEvents() {
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Navegación activa
    updateActiveNavigation();
}

// Actualizar interfaz de usuario
function updateUserInterface() {
    if (!App.currentUser) return;
    
    // Actualizar nombre del usuario
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = `${App.currentUser.nombre} ${App.currentUser.apellido}`;
    }
    
    // Actualizar avatar
    const userAvatarElement = document.querySelector('#userDropdown img');
    if (userAvatarElement) {
        userAvatarElement.src = App.currentUser.avatar || '/img/default-avatar.png';
        userAvatarElement.alt = `${App.currentUser.nombre} ${App.currentUser.apellido}`;
    }
    
    triggerEvent('userUpdated', App.currentUser);
}

// Actualizar navegación activa
function updateActiveNavigation() {
    const currentPath = window.location.pathname;
    
    // Remover clase active de todos los enlaces
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Agregar clase active al enlace correspondiente
    if (currentPath === '/feed') {
        document.querySelector('.nav-link[href="/feed"]')?.classList.add('active');
    } else if (currentPath === '/notifications') {
        document.querySelector('.nav-link[href="/notifications"]')?.classList.add('active');
    }
}

// Manejar logout
async function handleLogout(e) {
    if (e) e.preventDefault();
    
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            console.log('Logout exitoso');
            
            // Desconectar Socket.IO
            if (App.socket) {
                App.socket.disconnect();
            }
            
            // Limpiar estado
            App.currentUser = null;
            App.isAuthenticated = false;
            App.socket = null;
            
            // Redirigir a login
            window.location.href = '/login';
        } else {
            console.error('Error en logout');
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        window.location.href = '/login';
    }
}

// Actualizar contador de notificaciones
function updateNotificationCount(increment = 0) {
    if (increment > 0) {
        App.notificationCount += increment;
    }
    
    // Actualizar en el navbar
    const notificationBadge = document.getElementById('notificationBadge');
    if (notificationBadge) {
        if (App.notificationCount > 0) {
            notificationBadge.textContent = App.notificationCount;
            notificationBadge.style.display = 'inline';
        } else {
            notificationBadge.style.display = 'none';
        }
    }
}

// Cargar contador de notificaciones desde el servidor
async function loadNotificationCount() {
    try {
        const response = await fetch('/api/notifications/count', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            App.notificationCount = data.count || 0;
            updateNotificationCount();
        }
    } catch (error) {
        console.error('Error al cargar contador de notificaciones:', error);
    }
}

// Mostrar toast notification
function showToast({ title, message, type = 'info', duration = 5000 }) {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    
    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast" role="alert">
            <div class="toast-header">
                <strong class="me-auto">${title}</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: duration });
    toast.show();
    
    // Remover el elemento después de que se oculte
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

// Sistema de eventos
function on(event, callback) {
    if (!App.eventCallbacks[event]) {
        App.eventCallbacks[event] = [];
    }
    App.eventCallbacks[event].push(callback);
}

function triggerEvent(event, data = null) {
    if (App.eventCallbacks[event]) {
        App.eventCallbacks[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error en callback de evento ${event}:`, error);
            }
        });
    }
}

// API pública
window.AppAPI = {
    // Obtener usuario actual
    getCurrentUser: () => App.currentUser,
    
    // Obtener socket
    getSocket: () => App.socket,
    
    // Verificar si está autenticado
    isAuthenticated: () => App.isAuthenticated,
    
    // Actualizar contador de notificaciones
    updateNotificationCount,
    
    // Mostrar toast
    showToast,
    
    // Sistema de eventos
    on,
    
    // Logout
    logout: handleLogout
};

// Manejar errores de red
window.addEventListener('online', () => {
    console.log('Conexión restaurada');
    if (App.socket && !App.socket.connected) {
        App.socket.connect();
    }
});

window.addEventListener('offline', () => {
    console.log('Conexión perdida');
});

// Manejar cierre de ventana
window.addEventListener('beforeunload', () => {
    if (App.socket) {
        App.socket.disconnect();
    }
}); 