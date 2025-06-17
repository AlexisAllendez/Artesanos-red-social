// Notifications.js - Funcionalidad específica de notificaciones
// Usa el sistema de autenticación centralizado de app.js

// Variables globales de notificaciones
let currentUser = null;
let notifications = [];
let currentFilter = 'all';
let socket = null;

// Inicializar cuando la aplicación esté lista
document.addEventListener('DOMContentLoaded', function() {
    // Esperar a que la aplicación principal se inicialice
    if (window.App && window.App.currentUser) {
        initializeNotifications();
    } else {
        // Si la aplicación no está lista, esperar al evento
        window.AppAPI.on('userUpdated', initializeNotifications);
    }
});

function initializeNotifications() {
    // Obtener datos del usuario y socket desde la aplicación principal
    currentUser = window.AppAPI.getCurrentUser();
    socket = window.AppAPI.getSocket();
    
    if (!currentUser) {
        return;
    }
    
    // Configurar eventos
    setupEventListeners();
    
    // Cargar notificaciones
    loadNotifications();
    
    // Configurar eventos de Socket.IO específicos de notificaciones
    setupSocketEvents();
}

function setupEventListeners() {
    // Filtros
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const filter = btn.dataset.filter;
            setFilter(filter);
        });
    });
    
    // Botones de acción
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', () => {
            markAllAsRead();
        });
    }
    
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            deleteAllNotifications();
        });
    }
}

function setupSocketEvents() {
    if (!socket) return;
    
    // Escuchar nuevas notificaciones
    socket.on('nueva_solicitud', (data) => {
        addNotification({
            id: Date.now(),
            tipo: 'solicitud_amistad',
            mensaje: `${data.de.nombre} ${data.de.apellido} te envió una solicitud de amistad`,
            origen_id: data.de.id,
            origen_nombre: data.de.nombre,
            origen_apellido: data.de.apellido,
            origen_avatar: data.de.avatar,
            fecha: new Date().toISOString(),
            leida: false
        });
    });
    
    socket.on('amistad_aceptada', (data) => {
        addNotification({
            id: Date.now(),
            tipo: 'amistad_aceptada',
            mensaje: `${data.nombre} ${data.apellido} aceptó tu solicitud de amistad`,
            origen_id: data.usuario_id,
            origen_nombre: data.nombre,
            origen_apellido: data.apellido,
            origen_avatar: data.avatar,
            fecha: new Date().toISOString(),
            leida: false
        });
    });
    
    socket.on('nuevo_comentario', (data) => {
        addNotification({
            id: Date.now(),
            tipo: 'comentario',
            mensaje: `${data.nombre} ${data.apellido} comentó en tu imagen`,
            origen_id: data.autor_id,
            origen_nombre: data.nombre,
            origen_apellido: data.apellido,
            origen_avatar: data.avatar,
            contenido_id: data.imagen_id,
            fecha: new Date().toISOString(),
            leida: false
        });
    });

    socket.on('imagen_compartida', (data) => {
        addNotification({
            id: Date.now(),
            tipo: 'compartido',
            mensaje: `${data.nombre} ${data.apellido} compartió una imagen contigo`,
            origen_id: data.usuario_id,
            origen_nombre: data.nombre,
            origen_apellido: data.apellido,
            origen_avatar: data.avatar,
            contenido_id: data.imagen_id,
            fecha: new Date().toISOString(),
            leida: false
        });
    });

    socket.on('album_compartido', (data) => {
        addNotification({
            id: Date.now(),
            tipo: 'compartido',
            mensaje: `${data.nombre} ${data.apellido} compartió un álbum contigo`,
            origen_id: data.usuario_id,
            origen_nombre: data.nombre,
            origen_apellido: data.apellido,
            origen_avatar: data.avatar,
            contenido_id: data.album_id,
            fecha: new Date().toISOString(),
            leida: false
        });
    });
}

async function loadNotifications() {
    showLoading();
    
    try {
        const response = await fetch('/api/notifications', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            notifications = data.notifications || [];
            renderNotifications();
        } else {
            showEmpty();
        }
    } catch (error) {
        showEmpty();
    }
}

function renderNotifications() {
    const notificationsList = document.getElementById('notificationsList');
    if (!notificationsList) return;
    
    // Filtrar notificaciones según el filtro actual
    let filteredNotifications = notifications;
    
    if (currentFilter === 'unread') {
        filteredNotifications = notifications.filter(n => !n.leida);
    } else if (currentFilter === 'solicitudes_amistad') {
        filteredNotifications = notifications.filter(n => n.tipo === 'solicitud_amistad');
    } else if (currentFilter === 'amistad_aceptada') {
        filteredNotifications = notifications.filter(n => n.tipo === 'amistad_aceptada');
    } else if (currentFilter === 'comentario') {
        filteredNotifications = notifications.filter(n => n.tipo === 'comentario');
    } else if (currentFilter === 'compartido') {
        filteredNotifications = notifications.filter(n => n.tipo === 'compartido');
    }
    
    // Mostrar el contenedor de notificaciones
    notificationsList.style.display = 'block';
    
    if (filteredNotifications.length === 0) {
        showEmpty();
        return;
    }

    notificationsList.innerHTML = '';
    
    filteredNotifications.forEach(notification => {
        const element = createNotificationElement(notification);
        notificationsList.appendChild(element);
    });
    
    updateNotificationCount();
    hideLoading();
}

function createNotificationElement(notification) {
    const div = document.createElement('div');
    div.className = `list-group-item notification-item ${notification.leida ? '' : 'unread'}`;
    div.dataset.notificationId = notification.id;
    
    const icon = getNotificationIcon(notification.tipo);
    const avatar = notification.origen_avatar || '/img/default-avatar.png';
    
    // Crear enlace para ver contenido si existe
    let contentLink = '';
    if (notification.contenido_id) {
        if (notification.tipo === 'comentario') {
            contentLink = `<br><a href="/feed?view=image&id=${notification.contenido_id}" class="btn btn-sm btn-outline-primary mt-1">
                <i class="fas fa-eye me-1"></i>Ver imagen comentada
            </a>`;
        } else if (notification.tipo === 'compartido') {
            contentLink = `<br><a href="/feed?view=shared&id=${notification.contenido_id}" class="btn btn-sm btn-outline-info mt-1">
                <i class="fas fa-share me-1"></i>Ver contenido compartido
            </a>`;
        }
    }
    
    div.innerHTML = `
        <div class="d-flex align-items-start">
            <img src="${avatar}" alt="Avatar" class="rounded-circle notification-avatar me-3">
            <div class="notification-content">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <p class="mb-1">
                            <i class="${icon} me-2"></i>
                            <strong>${notification.origen_nombre} ${notification.origen_apellido}</strong> ${notification.mensaje}
                        </p>
                        <small class="notification-time">${formatDate(notification.fecha)}</small>
                        ${contentLink}
                    </div>
                    <div class="notification-actions">
                        ${getNotificationActions(notification)}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Configurar eventos
    setupNotificationEvents(div, notification);
    
    return div;
}

function getNotificationIcon(tipo) {
    const icons = {
        'solicitud_amistad': 'fas fa-user-plus',
        'amistad_aceptada': 'fas fa-user-check',
        'comentario': 'fas fa-comment',
        'compartido': 'fas fa-share'
    };
    return icons[tipo] || 'fas fa-bell';
}

function getNotificationActions(notification) {
    let actions = '';
    
    // Botones específicos para solicitudes de amistad
    if (notification.tipo === 'solicitud_amistad') {
        actions += `
            <button class="btn btn-sm btn-success accept-request-btn" title="Aceptar solicitud">
                <i class="fas fa-check"></i>
            </button>
            <button class="btn btn-sm btn-danger reject-request-btn" title="Rechazar solicitud">
                <i class="fas fa-times"></i>
            </button>
        `;
    }
    
    if (!notification.leida) {
        actions += `<button class="btn btn-sm btn-outline-primary mark-read-btn" title="Marcar como leída">
            <i class="fas fa-check"></i>
        </button>`;
    }
    
    actions += `<button class="btn btn-sm btn-outline-danger delete-btn" title="Eliminar">
        <i class="fas fa-trash"></i>
    </button>`;
    
    return actions;
}

function setupNotificationEvents(element, notification) {
    const markReadBtn = element.querySelector('.mark-read-btn');
    const deleteBtn = element.querySelector('.delete-btn');
    const acceptBtn = element.querySelector('.accept-request-btn');
    const rejectBtn = element.querySelector('.reject-request-btn');
    
    if (markReadBtn) {
        markReadBtn.addEventListener('click', () => markAsRead(notification.id));
    }
    
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deleteNotification(notification.id));
    }
    
    // Botones para solicitudes de amistad
    if (acceptBtn) {
        acceptBtn.addEventListener('click', () => acceptFriendRequest(notification));
    }
    
    if (rejectBtn) {
        rejectBtn.addEventListener('click', () => rejectFriendRequest(notification));
    }
    
    // Marcar como leída al hacer clic en la notificación
    element.addEventListener('click', (e) => {
        if (!e.target.closest('.notification-actions')) {
            if (!notification.leida) {
                markAsRead(notification.id);
            }
        }
    });
}

async function markAsRead(notificationId) {
    try {
        const response = await fetch(`/api/notifications/${notificationId}/read`, {
            method: 'PUT',
            credentials: 'include'
        });
        
        if (response.ok) {
            // Actualizar en la lista local
            const notification = notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.leida = true;
            }
            
            // Actualizar UI
            const element = document.querySelector(`[data-notification-id="${notificationId}"]`);
            if (element) {
                element.classList.remove('unread');
                const markReadBtn = element.querySelector('.mark-read-btn');
                if (markReadBtn) {
                    markReadBtn.remove();
                }
            }
            
            // Actualizar contador global
            window.AppAPI.updateNotificationCount(-1);
        }
    } catch (error) {
    }
}

async function markAllAsRead() {
    try {
        const response = await fetch('/api/notifications/read-all', {
            method: 'PUT',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Marcar todas como leídas en la lista local
            notifications.forEach(n => n.leida = true);
            
            // Actualizar UI
            const unreadElements = document.querySelectorAll('.notification-item.unread');
            unreadElements.forEach(element => {
                element.classList.remove('unread');
                const markReadBtn = element.querySelector('.mark-read-btn');
                if (markReadBtn) {
                    markReadBtn.remove();
                }
            });
            
            // Actualizar contador global
            const unreadCount = notifications.filter(n => !n.leida).length;
            window.App.notificationCount = unreadCount;
            window.AppAPI.updateNotificationCount();
            
            // Mostrar mensaje de éxito
            window.AppAPI.showToast({
                title: '¡Éxito!',
                message: data.message || 'Todas las notificaciones han sido marcadas como leídas',
                type: 'success'
            });
            
            // Re-renderizar para actualizar la vista
            renderNotifications();
        } else {
            const errorData = await response.json();
            window.AppAPI.showToast({
                title: 'Error',
                message: errorData.message || 'Error al marcar notificaciones como leídas',
                type: 'error'
            });
        }
    } catch (error) {
        window.AppAPI.showToast({
            title: 'Error',
            message: 'Error de conexión al marcar notificaciones como leídas',
            type: 'error'
        });
    }
}

async function deleteNotification(notificationId) {
    try {
        const response = await fetch(`/api/notifications/${notificationId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            // Remover de la lista local
            notifications = notifications.filter(n => n.id !== notificationId);
            
            // Remover del DOM
            const element = document.querySelector(`[data-notification-id="${notificationId}"]`);
            if (element) {
                element.remove();
            }

            // Actualizar contador
            const unreadCount = notifications.filter(n => !n.leida).length;
            window.App.notificationCount = unreadCount;
            window.AppAPI.updateNotificationCount();
            
            // Si no hay más notificaciones, mostrar estado vacío
            if (notifications.length === 0) {
                showEmpty();
            }
        }
    } catch (error) {
    }
}

async function deleteAllNotifications() {
    showConfirmModal(
        '¿Estás seguro de que quieres eliminar todas las notificaciones? Esta acción no se puede deshacer.',
        async () => {
            try {
                const response = await fetch('/api/notifications', {
                    method: 'DELETE',
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // Limpiar lista local
                    notifications = [];
                    
                    // Actualizar contador global
                    window.App.notificationCount = 0;
                    window.AppAPI.updateNotificationCount();
                    
                    // Mostrar mensaje de éxito
                    window.AppAPI.showToast({
                        title: '¡Éxito!',
                        message: data.message || 'Todas las notificaciones han sido eliminadas',
                        type: 'success'
                    });
                    
                    // Re-renderizar para mostrar estado vacío
                    renderNotifications();
                } else {
                    const errorData = await response.json();
                    window.AppAPI.showToast({
                        title: 'Error',
                        message: errorData.message || 'Error al eliminar notificaciones',
                        type: 'error'
                    });
                }
            } catch (error) {
                window.AppAPI.showToast({
                    title: 'Error',
                    message: 'Error de conexión al eliminar notificaciones',
                    type: 'error'
                });
            }
        }
    );
}

function setFilter(filter) {
    currentFilter = filter;
    
    // Actualizar botones activos
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active', 'btn-primary');
        btn.classList.add('btn-outline-primary');
    });
    
    const activeBtn = document.querySelector(`[data-filter="${filter}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('btn-outline-primary');
        activeBtn.classList.add('active', 'btn-primary');
    }
    
    // Re-renderizar notificaciones
    renderNotifications();
}

function addNotification(notification) {
    notifications.unshift(notification);
    renderNotifications();
    
    // Actualizar contador en el navbar
    const unreadCount = notifications.filter(n => !n.leida).length;
    window.App.notificationCount = unreadCount;
    window.AppAPI.updateNotificationCount();
}

function updateNotificationCount() {
    const unreadCount = notifications.filter(n => !n.leida).length;
    const countElement = document.getElementById('notificationCount');
    if (countElement) {
        countElement.textContent = unreadCount;
    }
}

function showLoading() {
    const loadingElement = document.getElementById('loadingState');
    const notificationsList = document.getElementById('notificationsList');
    const emptyState = document.getElementById('emptyState');
    
    if (loadingElement) loadingElement.style.display = 'block';
    if (notificationsList) notificationsList.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';
}

function hideLoading() {
    const loadingElement = document.getElementById('loadingState');
    
    if (loadingElement) loadingElement.style.display = 'none';
}

function showEmpty() {
    const loadingElement = document.getElementById('loadingState');
    const notificationsList = document.getElementById('notificationsList');
    const emptyState = document.getElementById('emptyState');
    
    if (loadingElement) loadingElement.style.display = 'none';
    if (notificationsList) notificationsList.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Ahora mismo';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} h`;
    if (days < 7) return `Hace ${days} días`;
    
    return date.toLocaleDateString('es-ES');
}

// Función para aceptar solicitud de amistad
async function acceptFriendRequest(notification) {
    try {
        // Obtener el ID de la solicitud desde la notificación
        const requestId = notification.contenido_id || notification.id;
        
        const response = await fetch(`/api/friends/accept/${requestId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (response.ok) {
            // Eliminar la notificación de solicitud
            await deleteNotification(notification.id);
            
            window.AppAPI.showToast({
                title: '¡Amistad aceptada!',
                message: `Ahora eres amigo de ${notification.origen_nombre} ${notification.origen_apellido}`,
                type: 'success'
            });
        } else {
            const error = await response.json();
            window.AppAPI.showToast({
                title: 'Error',
                message: error.message || 'Error al aceptar solicitud',
                type: 'error'
            });
        }
    } catch (error) {
        window.AppAPI.showToast({
            title: 'Error',
            message: 'Error de conexión',
            type: 'error'
        });
    }
}

// Función para rechazar solicitud de amistad
async function rejectFriendRequest(notification) {
    try {
        // Obtener el ID de la solicitud desde la notificación
        const requestId = notification.contenido_id || notification.id;
        
        const response = await fetch(`/api/friends/reject/${requestId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (response.ok) {
            // Eliminar la notificación de solicitud
            await deleteNotification(notification.id);
            
            window.AppAPI.showToast({
                title: 'Solicitud rechazada',
                message: 'Has rechazado la solicitud de amistad',
                type: 'info'
            });
        } else {
            const error = await response.json();
            window.AppAPI.showToast({
                title: 'Error',
                message: error.message || 'Error al rechazar solicitud',
                type: 'error'
            });
        }
    } catch (error) {
        window.AppAPI.showToast({
            title: 'Error',
            message: 'Error de conexión',
            type: 'error'
        });
    }
}

// Función para mostrar modal de confirmación bonito
function showConfirmModal(message, onConfirm) {
    const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
    const modalBody = document.getElementById('confirmModalBody');
    const confirmBtn = document.getElementById('confirmModalBtn');
    
    modalBody.textContent = message;
    
    // Remover event listeners anteriores
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    // Agregar nuevo event listener
    newConfirmBtn.addEventListener('click', () => {
        modal.hide();
        onConfirm();
    });
    
    modal.show();
} 