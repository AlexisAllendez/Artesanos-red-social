const Notification = require('../models/Notification');

// Obtener todas las notificaciones del usuario
const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20 } = req.query;
        
        // Asegurar que los parámetros sean números válidos
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 20;
        const offset = (pageNum - 1) * limitNum;
        
        const notifications = await Notification.obtenerPorUsuario(userId, limitNum, offset);
        
        // Contar total de notificaciones
        const totalNotifications = await Notification.obtenerPorUsuario(userId, 1000, 0);
        const totalPages = Math.ceil(totalNotifications.length / limitNum);
        
        res.json({
            success: true,
            notifications: notifications,
            pagination: {
                currentPage: pageNum,
                totalPages: totalPages,
                totalNotifications: totalNotifications.length,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            }
        });
    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener notificaciones'
        });
    }
};

// Obtener notificaciones no leídas
const getUnreadNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const notifications = await Notification.obtenerNoLeidas(userId);
        
        res.json({
            success: true,
            notifications: notifications
        });
    } catch (error) {
        console.error('Error al obtener notificaciones no leídas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener notificaciones no leídas'
        });
    }
};

// Obtener contador de notificaciones no leídas
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const count = await Notification.contarNoLeidas(userId);
        
        res.json({
            success: true,
            count: count
        });
    } catch (error) {
        console.error('Error al obtener contador de notificaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener contador de notificaciones'
        });
    }
};

// Marcar notificación como leída
const markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        
        const success = await Notification.marcarComoLeida(id, userId);
        
        if (success) {
            res.json({
                success: true,
                message: 'Notificación marcada como leída'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Notificación no encontrada'
            });
        }
    } catch (error) {
        console.error('Error al marcar notificación como leída:', error);
        res.status(500).json({
            success: false,
            message: 'Error al marcar notificación como leída'
        });
    }
};

// Marcar todas las notificaciones como leídas
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const count = await Notification.marcarTodasComoLeidas(userId);
        
        res.json({
            success: true,
            message: `${count} notificaciones marcadas como leídas`
        });
    } catch (error) {
        console.error('Error al marcar todas las notificaciones como leídas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al marcar notificaciones como leídas'
        });
    }
};

// Eliminar notificación
const deleteNotification = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        
        const success = await Notification.eliminar(id, userId);
        
        if (success) {
            res.json({
                success: true,
                message: 'Notificación eliminada'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Notificación no encontrada'
            });
        }
    } catch (error) {
        console.error('Error al eliminar notificación:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar notificación'
        });
    }
};

// Eliminar todas las notificaciones
const deleteAllNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const count = await Notification.eliminarTodas(userId);
        
        res.json({
            success: true,
            message: `${count} notificaciones eliminadas`
        });
    } catch (error) {
        console.error('Error al eliminar todas las notificaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar notificaciones'
        });
    }
};

// Obtener notificación específica
const getNotificationById = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        
        const notification = await Notification.obtenerPorId(id, userId);
        
        if (notification) {
            res.json({
                success: true,
                notification: notification
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Notificación no encontrada'
            });
        }
    } catch (error) {
        console.error('Error al obtener notificación:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener notificación'
        });
    }
};

module.exports = {
    getNotifications,
    getUnreadNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    getNotificationById
}; 