const { db } = require('../config/db');

class Comment {
    // Obtener comentarios de una imagen
    static async getByImageId(imageId) {
        try {
            const [comments] = await db.query(
                `SELECT c.*, u.nombre, u.apellido, u.avatar, u.id as autor_id
                FROM comentarios c 
                JOIN usuarios u ON c.autor_id = u.id 
                WHERE c.imagen_id = ? 
                ORDER BY c.fecha DESC`,
                [imageId]
            );
            return comments;
        } catch (error) {
            console.error('Error en Comment.getByImageId:', error);
            throw error;
        }
    }

    // Verificar acceso a una imagen
    static async verificarAccesoImagen(imageId, userId) {
        try {
            const [imageAccess] = await db.query(
                `SELECT i.*, a.usuario_id as propietario_id 
                FROM imagenes i 
                JOIN albumes a ON i.album_id = a.id 
                LEFT JOIN compartidos c ON i.id = c.imagen_id 
                WHERE i.id = ? AND (
                    a.usuario_id = ? OR 
                    c.compartido_con = ? OR 
                    i.es_publica = 1
                )`,
                [imageId, userId, userId]
            );
            return imageAccess[0] || null;
        } catch (error) {
            console.error('Error en Comment.verificarAccesoImagen:', error);
            throw error;
        }
    }

    // Crear un nuevo comentario
    static async crear({ imagen_id, autor_id, texto }) {
        try {
            const [result] = await db.query(
                'INSERT INTO comentarios (imagen_id, autor_id, texto) VALUES (?, ?, ?)',
                [imagen_id, autor_id, texto.trim()]
            );

            const [newComment] = await db.query(
                `SELECT c.*, u.nombre, u.apellido, u.avatar, u.id as autor_id
                FROM comentarios c 
                JOIN usuarios u ON c.autor_id = u.id 
                WHERE c.id = ?`,
                [result.insertId]
            );

            return newComment[0];
        } catch (error) {
            console.error('Error en Comment.crear:', error);
            throw error;
        }
    }

    // Obtener un comentario por ID
    static async getById(commentId) {
        try {
            const [comment] = await db.query(
                `SELECT c.*, u.nombre, u.apellido, u.avatar, u.id as autor_id
                FROM comentarios c 
                JOIN usuarios u ON c.autor_id = u.id 
                WHERE c.id = ?`,
                [commentId]
            );
            return comment[0] || null;
        } catch (error) {
            console.error('Error en Comment.getById:', error);
            throw error;
        }
    }

    // Verificar si el usuario puede editar un comentario
    static async verificarPermisoEdicion(commentId, userId) {
        try {
            const [comment] = await db.query(
                'SELECT * FROM comentarios WHERE id = ? AND autor_id = ?',
                [commentId, userId]
            );
            return comment.length > 0;
        } catch (error) {
            console.error('Error en Comment.verificarPermisoEdicion:', error);
            throw error;
        }
    }

    // Verificar si el usuario puede eliminar un comentario
    static async verificarPermisoEliminacion(commentId, userId) {
        try {
            const [comment] = await db.query(
                `SELECT c.*, a.usuario_id as propietario_id 
                FROM comentarios c
                JOIN imagenes i ON c.imagen_id = i.id
                JOIN albumes a ON i.album_id = a.id
                WHERE c.id = ? AND (c.autor_id = ? OR a.usuario_id = ?)`,
                [commentId, userId, userId]
            );
            return comment.length > 0;
        } catch (error) {
            console.error('Error en Comment.verificarPermisoEliminacion:', error);
            throw error;
        }
    }

    // Actualizar un comentario
    static async actualizar(commentId, texto) {
        try {
            await db.query(
                'UPDATE comentarios SET texto = ?, editado = 1, fecha_edicion = NOW() WHERE id = ?',
                [texto.trim(), commentId]
            );

            return await this.getById(commentId);
        } catch (error) {
            console.error('Error en Comment.actualizar:', error);
            throw error;
        }
    }

    // Eliminar un comentario
    static async eliminar(commentId) {
        try {
            const comment = await this.getById(commentId);
            if (!comment) {
                throw new Error('Comentario no encontrado');
            }

            await db.query('DELETE FROM comentarios WHERE id = ?', [commentId]);
            return comment.imagen_id;
        } catch (error) {
            console.error('Error en Comment.eliminar:', error);
            throw error;
        }
    }
}

module.exports = Comment; 