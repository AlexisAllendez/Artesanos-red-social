const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/authMiddleware');
const Comment = require('../models/Comment');

// Middleware para verificar acceso a imagen
const verificarAccesoImagen = async (req, res, next) => {
    try {
        const { imageId } = req.params;
        const imageData = await Comment.verificarAccesoImagen(imageId, req.user.id);
        
        if (!imageData) {
            return res.status(403).json({
                success: false,
                message: 'No tienes acceso a esta imagen'
            });
        }
        
        req.imageData = imageData;
        next();
    } catch (error) {
        console.error('Error al verificar acceso:', error);
        res.status(500).json({
            success: false,
            message: 'Error al verificar acceso a la imagen'
        });
    }
};

// Obtener comentarios de una imagen
router.get('/api/images/:imageId/comments', isAuthenticated, verificarAccesoImagen, async (req, res) => {
    try {
        const { imageId } = req.params;
        const comments = await Comment.getByImageId(imageId);
        
        res.json({
            success: true,
            comments: comments.map(comment => ({
                ...comment,
                es_autor: comment.autor_id === req.user.id
            }))
        });
    } catch (error) {
        console.error('Error al obtener comentarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los comentarios'
        });
    }
});

// Crear un nuevo comentario
router.post('/api/images/:imageId/comments', isAuthenticated, verificarAccesoImagen, async (req, res) => {
    try {
        const { imageId } = req.params;
        const { texto } = req.body;
        
        if (!texto || texto.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'El comentario no puede estar vacío'
            });
        }
        
        if (texto.length > 500) {
            return res.status(400).json({
                success: false,
                message: 'El comentario no puede exceder los 500 caracteres'
            });
        }
        
        const newComment = await Comment.crear({
            imagen_id: imageId,
            autor_id: req.user.id,
            texto
        });
        
        // Emitir evento de nuevo comentario si hay socket.io disponible
        if (req.app.get('io')) {
            const io = req.app.get('io');
            const commentData = {
                ...newComment,
                es_autor: false
            };
            
            // Notificar al propietario de la imagen si no es el autor del comentario
            if (req.imageData.propietario_id !== req.user.id) {
                io.to(`user_${req.imageData.propietario_id}`).emit('nuevo_comentario', {
                    ...commentData,
                    imagen_id: imageId,
                    imagen_titulo: req.imageData.titulo
                });
            }
        }

        res.status(201).json({
            success: true,
            message: 'Comentario agregado exitosamente',
            comment: {
                ...newComment,
                es_autor: true
            }
        });
    } catch (error) {
        console.error('Error al crear comentario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear el comentario'
        });
    }
});

// Editar un comentario
router.put('/api/images/:imageId/comments/:commentId', isAuthenticated, async (req, res) => {
    try {
        const { commentId, imageId } = req.params;
        const { texto } = req.body;
        
        if (!texto || texto.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'El comentario no puede estar vacío'
            });
        }
        
        if (texto.length > 500) {
            return res.status(400).json({
                success: false,
                message: 'El comentario no puede exceder los 500 caracteres'
            });
        }
        
        // Verificar si el usuario puede editar el comentario
        const puedeEditar = await Comment.verificarPermisoEdicion(commentId, req.user.id);
        if (!puedeEditar) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para editar este comentario'
            });
        }
        
        const updatedComment = await Comment.actualizar(commentId, texto);
        
        res.json({
            success: true,
            message: 'Comentario actualizado exitosamente',
            comment: {
                ...updatedComment,
                es_autor: true
            }
        });
    } catch (error) {
        console.error('Error al editar comentario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al editar el comentario'
        });
    }
});

// Eliminar un comentario
router.delete('/api/images/:imageId/comments/:commentId', isAuthenticated, async (req, res) => {
    try {
        const { commentId, imageId } = req.params;
        
        // Verificar si el usuario puede eliminar el comentario
        const puedeEliminar = await Comment.verificarPermisoEliminacion(commentId, req.user.id);
        if (!puedeEliminar) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para eliminar este comentario'
            });
        }
        
        const imagenId = await Comment.eliminar(commentId);
        
        res.json({
            success: true,
            message: 'Comentario eliminado exitosamente',
            imageId: imagenId
        });
    } catch (error) {
        console.error('Error al eliminar comentario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el comentario'
        });
    }
});

module.exports = router; 