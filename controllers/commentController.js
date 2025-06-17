const { pool } = require('../config/db');
const Comment = require('../models/Comment');
const Imagen = require('../models/Imagen');
const Album = require('../models/Album');
const Usuario = require('../models/Usuario');
const Notification = require('../models/Notification');

// Obtener comentarios de un post
const getComments = async (req, res) => {
    try {
        const { postId } = req.params;
        
        const comments = await Comment.getByImageId(postId);
        
        res.json(comments);
    } catch (error) {
        console.error('Error al obtener comentarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener comentarios'
        });
    }
};

// Crear nuevo comentario
const createComment = async (req, res) => {
    try {
        const { postId } = req.params;
        const { texto } = req.body;
        const userId = req.user.id;
        
        if (!texto || texto.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'El texto del comentario es requerido'
            });
        }
        
        // Verificar que la imagen existe y obtener el propietario
        const image = await Imagen.obtenerPorId(postId);
        if (!image) {
            return res.status(404).json({
                success: false,
                message: 'Imagen no encontrada'
            });
        }
        
        const album = await Album.obtenerPorId(image.album_id);
        if (!album) {
            return res.status(404).json({
                success: false,
                message: 'Álbum no encontrado'
            });
        }
        
        // Crear el comentario usando el modelo
        const commentData = {
            imagen_id: postId,
            autor_id: userId,
            texto: texto.trim()
        };
        
        const newComment = await Comment.crear(commentData);
        
        // Enviar notificación en tiempo real si el comentario no es del propio usuario
        if (album.usuario_id !== userId) {
            const userInfo = await Usuario.buscarPorId(userId);
            
            if (userInfo) {
                // Crear notificación en la base de datos
                await Notification.crearNotificacionComentario(postId, userId, album.usuario_id, texto.trim());
                
                const notificationData = {
                    ...newComment,
                    ...userInfo
                };
                
                // Emitir evento de nuevo comentario
                req.io.to(`user_${album.usuario_id}`).emit('nuevo_comentario', notificationData);
            }
        }
        
        res.status(201).json({
            success: true,
            message: 'Comentario creado exitosamente',
            comment: newComment
        });
    } catch (error) {
        console.error('Error al crear comentario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear comentario'
        });
    }
};

// Actualizar comentario
const updateComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { texto } = req.body;
        const userId = req.user.id;
        
        if (!texto || texto.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'El texto del comentario es requerido'
            });
        }
        
        // Verificar que el comentario pertenece al usuario
        const puedeEditar = await Comment.verificarPermisoEdicion(id, userId);
        if (!puedeEditar) {
            return res.status(404).json({
                success: false,
                message: 'Comentario no encontrado o no tienes permisos para editarlo'
            });
        }
        
        // Actualizar comentario usando el modelo
        const updatedComment = await Comment.actualizar(id, texto.trim());
        
        res.json({
            success: true,
            message: 'Comentario actualizado exitosamente',
            comment: updatedComment
        });
    } catch (error) {
        console.error('Error al actualizar comentario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar comentario'
        });
    }
};

// Eliminar comentario
const deleteComment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        // Verificar que el comentario pertenece al usuario
        const puedeEliminar = await Comment.verificarPermisoEliminacion(id, userId);
        if (!puedeEliminar) {
            return res.status(404).json({
                success: false,
                message: 'Comentario no encontrado o no tienes permisos para eliminarlo'
            });
        }
        
        // Eliminar comentario usando el modelo
        const imagenId = await Comment.eliminar(id);
        
        res.json({
            success: true,
            message: 'Comentario eliminado exitosamente',
            imageId: imagenId
        });
    } catch (error) {
        console.error('Error al eliminar comentario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar comentario'
        });
    }
};

module.exports = {
    getComments,
    createComment,
    updateComment,
    deleteComment
}; 