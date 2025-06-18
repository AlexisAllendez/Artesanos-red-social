const { db } = require('../config/db');

class Amistad {
    // Enviar solicitud de amistad
    static async enviarSolicitud(de_id, para_id) {
        // Verificar si ya existe una solicitud pendiente
        const existeSolicitud = await this.verificarSolicitudExistente(de_id, para_id);
        if (existeSolicitud) {
            throw new Error('Ya existe una solicitud de amistad pendiente');
        }

        // Verificar si existe una solicitud rechazada recientemente
        const solicitudRechazada = await this.verificarSolicitudRechazada(de_id, para_id);
        if (solicitudRechazada) {
            throw new Error('Debes esperar 30 días desde el último rechazo para volver a enviar una solicitud');
        }

        // Eliminar cualquier solicitud rechazada anterior
        await this.eliminarSolicitudRechazada(de_id, para_id);

        const query = `
            INSERT INTO amistades (de_id, para_id, estado)
            VALUES (?, ?, 'pendiente')
        `;
        try {
            const [result] = await db.query(query, [de_id, para_id]);
            return result.insertId;
        } catch (error) {
            throw new Error('Error al enviar solicitud de amistad: ' + error.message);
        }
    }

    // Aceptar solicitud de amistad
    static async aceptarSolicitud(id) {
        const query = `
            UPDATE amistades 
            SET estado = 'aceptada', fecha_respuesta = CURRENT_TIMESTAMP
            WHERE id = ? AND estado = 'pendiente'
        `;
        try {
            const [result] = await db.query(query, [id]);
            if (result.affectedRows > 0) {
                // Obtener información de la amistad para crear el álbum
                const amistad = await this.obtenerPorId(id);
                if (amistad) {
                    // Aquí se debería llamar al modelo Album para crear el álbum de amistad
                    // Esto se implementará cuando creemos el controlador
                }
            }
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error('Error al aceptar solicitud de amistad: ' + error.message);
        }
    }

    // Rechazar solicitud de amistad
    static async rechazarSolicitud(id) {
        const query = `
            UPDATE amistades 
            SET estado = 'rechazada', fecha_respuesta = CURRENT_TIMESTAMP
            WHERE id = ? AND estado = 'pendiente'
        `;
        try {
            const [result] = await db.query(query, [id]);
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error('Error al rechazar solicitud de amistad: ' + error.message);
        }
    }

    // Obtener solicitudes pendientes de un usuario
    static async obtenerSolicitudesPendientes(usuario_id) {
        const query = `
            SELECT a.*, 
                   u.nombre, u.apellido, u.avatar, u.tipo_artesania
            FROM amistades a
            JOIN usuarios u ON a.de_id = u.id
            WHERE a.para_id = ? AND a.estado = 'pendiente'
            ORDER BY a.fecha_solicitud DESC
        `;
        try {
            const [rows] = await db.query(query, [usuario_id]);
            return rows;
        } catch (error) {
            throw new Error('Error al obtener solicitudes pendientes: ' + error.message);
        }
    }

    // Obtener amigos de un usuario
    static async obtenerAmigos(usuario_id) {
        const query = `
            SELECT u.id, u.nombre, u.apellido, u.avatar, u.tipo_artesania,
                   a.fecha_respuesta as fecha_amistad
            FROM amistades a
            JOIN usuarios u ON (
                CASE 
                    WHEN a.de_id = ? THEN a.para_id = u.id
                    ELSE a.de_id = u.id
                END
            )
            WHERE (a.de_id = ? OR a.para_id = ?)
            AND a.estado = 'aceptada'
            ORDER BY a.fecha_respuesta DESC
        `;
        try {
            const [rows] = await db.query(query, [usuario_id, usuario_id, usuario_id]);
            return rows;
        } catch (error) {
            throw new Error('Error al obtener amigos: ' + error.message);
        }
    }

    // Verificar si dos usuarios son amigos
    static async verificarAmistad(usuario1_id, usuario2_id) {
        const query = `
            SELECT id, estado
            FROM amistades
            WHERE ((de_id = ? AND para_id = ?) OR (de_id = ? AND para_id = ?))
            AND estado = 'aceptada'
        `;
        try {
            const [rows] = await db.query(query, [usuario1_id, usuario2_id, usuario2_id, usuario1_id]);
            return rows.length > 0;
        } catch (error) {
            throw new Error('Error al verificar amistad: ' + error.message);
        }
    }

    // Verificar si existe una solicitud pendiente
    static async verificarSolicitudExistente(de_id, para_id) {
        const query = `
            SELECT id, estado
            FROM amistades
            WHERE ((de_id = ? AND para_id = ?) OR (de_id = ? AND para_id = ?))
            AND estado = 'pendiente'
        `;
        try {
            const [rows] = await db.query(query, [de_id, para_id, para_id, de_id]);
            return rows.length > 0;
        } catch (error) {
            throw new Error('Error al verificar solicitud existente: ' + error.message);
        }
    }

    // Verificar si existe una solicitud rechazada recientemente
    static async verificarSolicitudRechazada(de_id, para_id) {
        const query = `
            SELECT id, estado, fecha_respuesta
            FROM amistades
            WHERE ((de_id = ? AND para_id = ?) OR (de_id = ? AND para_id = ?))
            AND estado = 'rechazada'
            AND fecha_respuesta > DATE_SUB(NOW(), INTERVAL 30 DAY)
        `;
        try {
            const [rows] = await db.query(query, [de_id, para_id, para_id, de_id]);
            return rows.length > 0;
        } catch (error) {
            throw new Error('Error al verificar solicitud rechazada: ' + error.message);
        }
    }

    // Eliminar solicitud rechazada anterior
    static async eliminarSolicitudRechazada(de_id, para_id) {
        const query = `
            DELETE FROM amistades
            WHERE ((de_id = ? AND para_id = ?) OR (de_id = ? AND para_id = ?))
            AND estado = 'rechazada'
        `;
        try {
            const [result] = await db.query(query, [de_id, para_id, para_id, de_id]);
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error('Error al eliminar solicitud rechazada: ' + error.message);
        }
    }

    // Obtener una solicitud por ID
    static async obtenerPorId(id) {
        const query = `
            SELECT a.*, 
                   u1.nombre as de_nombre, u1.apellido as de_apellido,
                   u2.nombre as para_nombre, u2.apellido as para_apellido
            FROM amistades a
            JOIN usuarios u1 ON a.de_id = u1.id
            JOIN usuarios u2 ON a.para_id = u2.id
            WHERE a.id = ?
        `;
        try {
            const [rows] = await db.query(query, [id]);
            return rows[0];
        } catch (error) {
            throw new Error('Error al obtener solicitud: ' + error.message);
        }
    }

    // Buscar usuarios para agregar como amigos
    static async buscarUsuarios(termino, usuario_id, limite = 10) {
        const query = `
            SELECT DISTINCT u.id, u.nombre, u.apellido, u.avatar, u.tipo_artesania,
                   CASE 
                       WHEN a.id IS NOT NULL THEN a.estado
                       ELSE 'no_solicitud'
                   END as estado_amistad,
                   a.de_id,
                   a.id as amistad_id
            FROM usuarios u
            LEFT JOIN amistades a ON (
                (a.de_id = ? AND a.para_id = u.id) OR 
                (a.de_id = u.id AND a.para_id = ?)
            )
            WHERE u.id != ?
            AND u.estado = 'activo'
            AND (
                u.nombre LIKE ? OR 
                u.apellido LIKE ? OR 
                u.tipo_artesania LIKE ?
            )
            ORDER BY u.nombre, u.apellido
            LIMIT ?
        `;
        const terminoBusqueda = `%${termino}%`;
        try {
            const [rows] = await db.query(query, [
                usuario_id,
                usuario_id,
                usuario_id,
                terminoBusqueda,
                terminoBusqueda,
                terminoBusqueda,
                limite
            ]);
            return rows;
        } catch (error) {
            throw new Error('Error al buscar usuarios: ' + error.message);
        }
    }
}

module.exports = Amistad; 