const { db, pool } = require('../config/db');

class Notification {
    // Crear nueva notificación
    static async crear(datos) {
        const connection = await pool.getConnection();
        try {
            const { usuario_id, origen_id, tipo, contenido_id, mensaje } = datos;
            
            const query = `
                INSERT INTO notificaciones (usuario_id, origen_id, tipo, contenido_id, mensaje)
                VALUES (?, ?, ?, ?, ?)
            `;
            
            const [result] = await connection.execute(query, [
                usuario_id, origen_id, tipo, contenido_id, mensaje
            ]);
            
            return result.insertId;
        } finally {
            connection.release();
        }
    }

    // Obtener notificaciones de un usuario
    static async obtenerPorUsuario(usuarioId, limite = 50, offset = 0) {
        const connection = await pool.getConnection();
        try {
            // Validar y convertir parámetros
            if (!usuarioId || isNaN(usuarioId)) {
                throw new Error('usuarioId inválido');
            }
            
            const userId = parseInt(usuarioId);
            const limit = parseInt(limite) || 50;
            const off = parseInt(offset) || 0;
            
            // Usar interpolación de strings para LIMIT y OFFSET, parámetros preparados solo para WHERE
            const query = `
                SELECT n.*, 
                       u.nombre as origen_nombre, 
                       u.apellido as origen_apellido, 
                       u.avatar as origen_avatar
                FROM notificaciones n
                JOIN usuarios u ON n.origen_id = u.id
                WHERE n.usuario_id = ?
                ORDER BY n.fecha DESC
                LIMIT ${off}, ${limit}
            `;
            
            const params = [userId];
            const [rows] = await connection.execute(query, params);
            return rows;
        } finally {
            connection.release();
        }
    }

    // Obtener notificaciones no leídas de un usuario
    static async obtenerNoLeidas(usuarioId) {
        const connection = await pool.getConnection();
        try {
            const query = `
                SELECT n.*, 
                       u.nombre as origen_nombre, 
                       u.apellido as origen_apellido, 
                       u.avatar as origen_avatar
                FROM notificaciones n
                JOIN usuarios u ON n.origen_id = u.id
                WHERE n.usuario_id = ? AND n.leida = FALSE
                ORDER BY n.fecha DESC
            `;
            
            const [rows] = await connection.execute(query, [usuarioId]);
            return rows;
        } finally {
            connection.release();
        }
    }

    // Contar notificaciones no leídas
    static async contarNoLeidas(usuarioId) {
        const connection = await pool.getConnection();
        try {
            const query = `
                SELECT COUNT(*) as count
                FROM notificaciones
                WHERE usuario_id = ? AND leida = FALSE
            `;
            
            const [rows] = await connection.execute(query, [usuarioId]);
            return rows[0].count;
        } finally {
            connection.release();
        }
    }

    // Marcar notificación como leída
    static async marcarComoLeida(notificacionId, usuarioId) {
        const connection = await pool.getConnection();
        try {
            const query = `
                UPDATE notificaciones 
                SET leida = TRUE 
                WHERE id = ? AND usuario_id = ?
            `;
            
            const [result] = await connection.execute(query, [notificacionId, usuarioId]);
            return result.affectedRows > 0;
        } finally {
            connection.release();
        }
    }

    // Marcar todas las notificaciones como leídas
    static async marcarTodasComoLeidas(usuarioId) {
        const connection = await pool.getConnection();
        try {
            const query = `
                UPDATE notificaciones 
                SET leida = TRUE 
                WHERE usuario_id = ?
            `;
            
            const [result] = await connection.execute(query, [usuarioId]);
            return result.affectedRows;
        } finally {
            connection.release();
        }
    }

    // Eliminar notificación
    static async eliminar(notificacionId, usuarioId) {
        const connection = await pool.getConnection();
        try {
            const query = `
                DELETE FROM notificaciones 
                WHERE id = ? AND usuario_id = ?
            `;
            
            const [result] = await connection.execute(query, [notificacionId, usuarioId]);
            return result.affectedRows > 0;
        } finally {
            connection.release();
        }
    }

    // Eliminar todas las notificaciones de un usuario
    static async eliminarTodas(usuarioId) {
        const connection = await pool.getConnection();
        try {
            const query = `
                DELETE FROM notificaciones 
                WHERE usuario_id = ?
            `;
            
            const [result] = await connection.execute(query, [usuarioId]);
            return result.affectedRows;
        } finally {
            connection.release();
        }
    }

    // Obtener notificación por ID
    static async obtenerPorId(notificacionId, usuarioId) {
        const connection = await pool.getConnection();
        try {
            const query = `
                SELECT n.*, 
                       u.nombre as origen_nombre, 
                       u.apellido as origen_apellido, 
                       u.avatar as origen_avatar
                FROM notificaciones n
                JOIN usuarios u ON n.origen_id = u.id
                WHERE n.id = ? AND n.usuario_id = ?
            `;
            
            const [rows] = await connection.execute(query, [notificacionId, usuarioId]);
            return rows[0] || null;
        } finally {
            connection.release();
        }
    }

    // Crear notificación de comentario
    static async crearNotificacionComentario(imagenId, autorId, propietarioId, texto) {
        const mensaje = `comentó en tu imagen`;
        return await this.crear({
            usuario_id: propietarioId,
            origen_id: autorId,
            tipo: 'comentario',
            contenido_id: imagenId,
            mensaje: mensaje
        });
    }

    // Crear notificación de solicitud de amistad
    static async crearNotificacionSolicitudAmistad(deId, paraId, solicitudId) {
        const mensaje = `te envió una solicitud de amistad`;
        return await this.crear({
            usuario_id: paraId,
            origen_id: deId,
            tipo: 'solicitud_amistad',
            contenido_id: solicitudId,
            mensaje: mensaje
        });
    }

    // Crear notificación de amistad aceptada
    static async crearNotificacionAmistadAceptada(deId, paraId) {
        const mensaje = `aceptó tu solicitud de amistad`;
        return await this.crear({
            usuario_id: deId,
            origen_id: paraId,
            tipo: 'amistad_aceptada',
            contenido_id: null,
            mensaje: mensaje
        });
    }

    // Crear notificación de contenido compartido
    static async crearNotificacionCompartido(compartidoConId, origenId, tipoContenido, contenidoId) {
        const mensaje = `compartió ${tipoContenido} contigo`;
        return await this.crear({
            usuario_id: compartidoConId,
            origen_id: origenId,
            tipo: 'compartido',
            contenido_id: contenidoId,
            mensaje: mensaje
        });
    }
}

module.exports = Notification; 